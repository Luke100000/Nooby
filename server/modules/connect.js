function sendDisconnected(channel, client, ctx) {
    for (const receiver of channel.clients) {
        if (receiver.userId !== client.userId) {
            ctx.router.send(receiver, client, {m: "disconnected"})
        }
    }
}

function destroyClient(ctx, client) {
    if (!client.channel) return

    const channelName = client.channel
    const channel = ctx.channels.get(channelName)
    if (!channel) return

    sendDisconnected(channel, client, ctx);

    ctx.channels.removeClient(channelName, client)
    ctx.channels.removeIfEmpty(channelName)
}

function receive(ctx, client, msg) {
    if (msg.header.channel != null && typeof msg.header.channel !== "string") {
        ctx.router.sendError(client, msg, "invalid channel")
        return
    }

    const nextChannel = msg.header.channel || null

    if (client.channel) {
        const previousChannel = ctx.channels.get(client.channel)
        if (previousChannel) {
            if (client.channel === nextChannel) {
                ctx.router.sendError(client, msg, "already in channel")
                return
            }

            sendDisconnected(previousChannel, client, ctx);

            ctx.channels.removeClient(client.channel, client)
            ctx.channels.removeIfEmpty(client.channel)
        }
    }

    if (nextChannel) {
        client.channel = nextChannel
    } else {
        client.channel = ctx.channels.createPrivateName()
    }

    const channel = ctx.channels.ensure(client.channel)
    if (channel.password && channel.password !== msg.header.password) {
        client.channel = false
        ctx.router.sendError(client, msg, "wrong password")
        return
    }

    const userId = ctx.channels.assignUserId(channel)
    if (userId == null) {
        client.channel = false
        ctx.router.sendError(client, msg, "channel full")
        return
    }

    client.userId = userId
    if (!nextChannel) {
        channel.host = client.userId
    }
    channel.clients.push(client)
    channel.tags[client.userId] = {}

    if (msg.header.settings) {
        ctx.modules.settings.receive(ctx, client, msg)
    }

    const headers = {m: "connected", channel: client.channel, host: channel.host}
    for (const receiver of channel.clients) {
        if (receiver.userId !== client.userId) {
            ctx.router.send(receiver, client, headers)
        }
    }
    ctx.router.send(client, client, headers)
}

module.exports = {
    destroyClient,
    receive,
    aliases: ["c"],
}
