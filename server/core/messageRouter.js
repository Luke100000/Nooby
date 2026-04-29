const fs = require("fs")
const path = require("path")
const {Message} = require("../protocol/message.js")
const {encodeMessage, encodeChunkHeader} = require("../protocol/frameEncoder.js")

class MessageRouter {
    constructor(options) {
        this.context = options.context
        this.moduleRegistry = options.moduleRegistry
        this.stats = options.stats
        this.logger = options.logger
        this.crashLogDirectory = options.crashLogDirectory
    }

    receive(client, message) {
        this.stats.add("incomingMessages", 1)
        this.stats.add("incomingBytes", 6 + message.headerSize + message.payloadSize)
        this.logger.verbose("received", client.id, message)

        const packetModule = this.moduleRegistry.get(message.header.m)
        if (!packetModule) {
            this.logger.log("Unknown message type '" + message.header.m + "'")
            return
        }
        if (!packetModule.receive) return

        try {
            packetModule.receive(this.context, client, message)
        } catch (error) {
            console.log(error)
            this.writeCrashLog(error)
        }
    }

    send(receiver, sender, header) {
        this.sendMessage(receiver, sender, new Message(header))
    }

    sendMessage(receiver, sender, message) {
        this.stats.add("outgoingMessages", 1)
        this.stats.add("outgoingBytes", message.headerSize + message.payloadSize)
        this.logger.verbose("sent", receiver.id + " to " + sender.id, message)

        if (!message.headerPacket) {
            message.headerPacket = encodeMessage(message)
        }

        this.sendChunk(receiver, sender, message.headerPacket)

        if (message.payloadMessage) {
            message.payloadMessage.listeners.push(receiver)
        }
    }

    sendChunk(receiver, sender, chunk) {
        receiver.send(encodeChunkHeader(sender, chunk))
        receiver.send(chunk)
    }

    sendError(client, msg, reason) {
        this.send(client, client, {
            m: "error",
            header: msg.header,
            reason: reason,
        })
    }

    forwardPayloadChunk(sender, payload) {
        for (const receiver of sender.receiving.listeners) {
            this.sendChunk(receiver, sender, payload)
        }
    }

    shutdown(clients) {
        for (const client of clients) {
            this.sendMessage(client, client, new Message({m: "shutdown"}))
        }
    }

    writeCrashLog(error) {
        let err = error.message
        if ("stack" in error) {
            err += "\n" + error.stack
        }
        fs.writeFileSync(path.join(this.crashLogDirectory, Date.now().toString() + ".txt"), err)
    }
}

module.exports = MessageRouter
