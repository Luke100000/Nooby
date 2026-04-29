const assert = require("assert")
const msgpack = require("msgpack-js")

const FrameParser = require("../protocol/frameParser.js")
const ChannelStore = require("../core/channelStore.js")
const {Message} = require("../protocol/message.js")

const connectModule = require("../modules/connect.js")
const directMessageModule = require("../modules/directMessage.js")
const getChannelsModule = require("../modules/getChannels.js")
const getTagsModule = require("../modules/getTags.js")
const messageModule = require("../modules/message.js")
const settingsModule = require("../modules/settings.js")
const tagModule = require("../modules/tag.js")

function packMessage(header, payload) {
    const headerBytes = header ? msgpack.encode(header) : Buffer.alloc(0)
    const payloadBytes = payload || Buffer.alloc(0)
    const packet = Buffer.alloc(6 + headerBytes.length + payloadBytes.length)

    packet.writeUInt16BE(headerBytes.length, 0)
    packet.writeUInt32BE(payloadBytes.length, 2)
    headerBytes.copy(packet, 6)
    payloadBytes.copy(packet, 6 + headerBytes.length)

    return packet
}

function createParser() {
    const messages = []
    const chunks = []
    const parser = new FrameParser(
        (client, message) => {
            messages.push(message)
        },
        (client, payload) => {
            chunks.push(payload)
        }
    )
    const client = {receiving: false}
    parser.initClient(client)
    return {parser, client, messages, chunks}
}

function createContext() {
    const clients = []
    const sent = []
    const sentMessages = []
    const errors = []

    const ctx = {
        channels: new ChannelStore(function () {}),
        clients: {
            all: function () {
                return clients
            },
        },
        modules: {
            settings: settingsModule,
        },
        router: {
            send: function (receiver, sender, header) {
                sent.push({receiver, sender, header})
            },
            sendMessage: function (receiver, sender, message) {
                sentMessages.push({receiver, sender, message})
                if (message.payloadMessage) {
                    message.payloadMessage.listeners.push(receiver)
                }
            },
            sendError: function (client, msg, reason) {
                errors.push({client, msg, reason})
            },
        },
    }

    return {ctx, clients, sent, sentMessages, errors}
}

function testPartialHeaderAndPayload() {
    const {parser, client, messages, chunks} = createParser()
    const packet = packMessage({m: "ping", value: 1}, Buffer.from("hello"))

    parser.receive(client, packet.subarray(0, 3))
    assert.strictEqual(messages.length, 0)

    parser.receive(client, packet.subarray(3, 10))
    assert.strictEqual(messages.length, 0)

    parser.receive(client, packet.subarray(10))
    assert.strictEqual(messages.length, 1)
    assert.strictEqual(messages[0].header.m, "ping")
    assert.strictEqual(messages[0].payloadSize, 5)
    assert.strictEqual(Buffer.concat(chunks).toString(), "hello")
    assert.strictEqual(client.bytesReceived, 0)
}

function testDefaultMessageHeader() {
    const {parser, client, messages, chunks} = createParser()
    parser.receive(client, packMessage(null, Buffer.from("abc")))

    assert.strictEqual(messages.length, 1)
    assert.deepStrictEqual(messages[0].header, {m: "message"})
    assert.strictEqual(Buffer.concat(chunks).toString(), "abc")
}

function testMultipleMessagesInOneRead() {
    const {parser, client, messages, chunks} = createParser()
    const packet = Buffer.concat([
        packMessage({m: "ping"}, Buffer.from("a")),
        packMessage({m: "message"}, Buffer.from("b")),
    ])

    parser.receive(client, packet)

    assert.strictEqual(messages.length, 2)
    assert.strictEqual(messages[0].header.m, "ping")
    assert.strictEqual(messages[1].header.m, "message")
    assert.strictEqual(Buffer.concat(chunks).toString(), "ab")
}

function testLargePayloadStreamsWithinFixedBuffer() {
    const {parser, client, chunks} = createParser()
    const payload = Buffer.alloc(200000, 7)

    parser.receive(client, packMessage(null, payload))

    assert.strictEqual(client.buffer.length, 65536)
    assert.strictEqual(Buffer.concat(chunks).length, payload.length)
    assert(chunks.length > 1)
    assert.strictEqual(client.bytesReceived, 0)
}

function testMalformedHeaderFails() {
    const {parser, client} = createParser()
    const packet = Buffer.from([0, 1, 0, 0, 0, 0, 0xC1])

    assert.throws(function () {
        parser.receive(client, packet)
    })
}

function testChannelUserIdsWrapAndReuseFreeIds() {
    const store = new ChannelStore(function () {})
    const channel = store.ensure("test")

    channel.lastUserId = 0xFFFF
    channel.clients.push({userId: 0xFFFF})

    assert.strictEqual(store.assignUserId(channel), 0)
    assert.strictEqual(channel.lastUserId, 1)

    channel.clients.push({userId: 0})
    assert.strictEqual(store.assignUserId(channel), 1)
}

function testChannelFull() {
    const store = new ChannelStore(function () {})
    const channel = store.ensure("full")

    for (let userId = 0; userId <= 0xFFFF; userId++) {
        channel.clients.push({userId})
    }

    assert.strictEqual(store.assignUserId(channel), null)
}

function testConnectSettingsAndGetChannels() {
    const {ctx, clients, sent, errors} = createContext()
    const host = {id: "host"}
    clients.push(host)

    connectModule.receive(ctx, host, {
        header: {
            m: "connect",
            password: "pw",
            settings: {
                password: "pw",
                visible: true,
                game: "game",
                description: "desc",
                name: "Room",
            },
        },
    })

    assert.strictEqual(errors.length, 0)
    assert.strictEqual(host.userId, 0)
    assert.strictEqual(sent[sent.length - 1].header.m, "connected")

    const listClient = {id: "list"}
    getChannelsModule.receive(ctx, listClient, {header: {game: "game"}})

    const response = sent[sent.length - 1].header
    assert.strictEqual(response.m, "channels")
    assert.strictEqual(response.channels.length, 1)
    assert.strictEqual(response.channels[0].name, "Room")
    assert.strictEqual(response.channels[0].password, true)
}

function testReconnectNotifiesPreviousChannel() {
    const {ctx, clients, sent} = createContext()
    const host = {id: "host"}
    const guest = {id: "guest"}
    clients.push(host, guest)

    connectModule.receive(ctx, host, {header: {m: "connect", channel: "old"}})
    connectModule.receive(ctx, guest, {header: {m: "connect", channel: "old"}})
    connectModule.receive(ctx, guest, {header: {m: "connect", channel: "new"}})

    assert(sent.some(function (entry) {
        return entry.receiver === host && entry.sender === guest && entry.header.m === "disconnected"
    }))
    assert.strictEqual(guest.channel, "new")
    assert.strictEqual(ctx.channels.get("old").clients.length, 1)
}

function testDirectMessageAndBroadcastRegisterPayloadListeners() {
    const {ctx, clients, sentMessages} = createContext()
    const a = {id: "a", channel: "room", userId: 0}
    const b = {id: "b", channel: "room", userId: 1}
    const c = {id: "c", channel: "room", userId: 2}
    clients.push(a, b, c)
    ctx.channels.ensure("room")
    const channel = ctx.channels.get("room")
    channel.clients.push(a, b, c)
    channel.tags[0] = {}
    channel.tags[1] = {team: "red"}
    channel.tags[2] = {team: "blue"}

    const broadcast = new Message({m: "message", t: {team: "red"}})
    broadcast.payloadSize = 10
    messageModule.receive(ctx, a, broadcast)

    assert.strictEqual(sentMessages.length, 1)
    assert.strictEqual(sentMessages[0].receiver, b)
    assert.strictEqual(broadcast.listeners[0], b)

    const direct = new Message({m: "directMessage", u: 2})
    direct.payloadSize = 10
    directMessageModule.receive(ctx, a, direct)

    assert.strictEqual(sentMessages.length, 2)
    assert.strictEqual(sentMessages[1].receiver, c)
    assert.strictEqual(direct.listeners[0], c)
}

function testTagsAndGetTags() {
    const {ctx, clients, sent, errors} = createContext()
    const admin = {id: "admin", channel: "room", userId: 0}
    const user = {id: "user", channel: "room", userId: 1}
    clients.push(admin, user)
    ctx.channels.ensure("room")
    const channel = ctx.channels.get("room")
    channel.clients.push(admin, user)
    channel.tags[0] = {admin: true}
    channel.tags[1] = {}

    tagModule.receive(ctx, user, {header: {m: "tag", tag: "ready", value: true}})
    assert.strictEqual(channel.tags[1].ready, true)

    tagModule.receive(ctx, admin, {header: {m: "tag", u: 1, tag: "team", value: "red"}})
    assert.strictEqual(channel.tags[1].team, "red")

    getTagsModule.receive(ctx, admin, {header: {m: "getTags", u: 1}})
    assert.strictEqual(sent[sent.length - 1].header.m, "tags")
    assert.deepStrictEqual(sent[sent.length - 1].header.tags, {ready: true, team: "red"})

    getTagsModule.receive(ctx, user, {header: {m: "getTags", u: 0}})
    assert.strictEqual(errors[errors.length - 1].reason, "permission denied")
}

const tests = [
    testPartialHeaderAndPayload,
    testDefaultMessageHeader,
    testMultipleMessagesInOneRead,
    testLargePayloadStreamsWithinFixedBuffer,
    testMalformedHeaderFails,
    testChannelUserIdsWrapAndReuseFreeIds,
    testChannelFull,
    testConnectSettingsAndGetChannels,
    testReconnectNotifiesPreviousChannel,
    testDirectMessageAndBroadcastRegisterPayloadListeners,
    testTagsAndGetTags,
]

for (const test of tests) {
    test()
    console.log("ok - " + test.name)
}
