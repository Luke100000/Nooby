const msgpack = require("msgpack-js")
const {Message, ParserState} = require("./message.js")

const MAX_PENDING_BYTES = 65536
const MIN_PACKET_SIZE = 1024

class FrameParser {
    constructor(onMessage, onPayloadChunk) {
        this.onMessage = onMessage
        this.onPayloadChunk = onPayloadChunk
    }

    initClient(client) {
        client.buffer = Buffer.allocUnsafe(MAX_PENDING_BYTES)
        client.bytesReceived = 0
    }

    receive(client, data) {
        let offset = 0

        while (offset < data.length) {
            // Socket reads may be larger than the protocol buffer. Append only
            // what fits, process, then continue with the remaining bytes.
            const writableBytes = Math.min(data.length - offset, MAX_PENDING_BYTES - client.bytesReceived)

            if (writableBytes === 0) {
                if (!this.process(client)) {
                    throw new Error("parser stalled with " + MAX_PENDING_BYTES + " pending bytes")
                }
                continue
            }

            data.copy(client.buffer, client.bytesReceived, offset, offset + writableBytes)
            client.bytesReceived += writableBytes
            offset += writableBytes

            while (this.process(client)) {}
        }

        while (this.process(client)) {}
    }

    consume(client, length) {
        if (length === 0) return

        if (length >= client.bytesReceived) {
            client.bytesReceived = 0
            return
        }

        client.bytesReceived = client.buffer.copy(client.buffer, 0, length, client.bytesReceived)
    }

    process(client) {
        if (!client.receiving) {
            if (client.bytesReceived < 6) return false

            client.receiving = new Message(null)
            client.receiving.headerSize = client.buffer.readUInt16BE(0)
            client.receiving.payloadSize = client.buffer.readUint32BE(2)
            this.consume(client, 6)
            return true
        }

        if (client.receiving.state === ParserState.HEADER) {
            if (client.bytesReceived < client.receiving.headerSize) return false

            if (client.receiving.headerSize === 0) {
                client.receiving.header = {m: "message"}
            } else {
                const header = client.buffer.subarray(0, client.receiving.headerSize)
                client.receiving.header = msgpack.decode(header)
                client.receiving.header.m = client.receiving.header.m || "message"
                this.consume(client, client.receiving.headerSize)
            }

            this.onMessage(client, client.receiving)
            client.receiving.state = ParserState.PAYLOAD
            return true
        }

        if (client.receiving.state === ParserState.PAYLOAD) {
            if (client.receiving.payloadSize === 0 || client.receiving.payloadReceived === client.receiving.payloadSize) {
                client.receiving.state = ParserState.DONE
                client.receiving = false
                return true
            }

            const remaining = client.receiving.payloadSize - client.receiving.payloadReceived
            const chunkSize = Math.min(remaining, client.bytesReceived, MAX_PENDING_BYTES)
            if (chunkSize < MIN_PACKET_SIZE && chunkSize !== remaining) return false

            const payload = Buffer.from(client.buffer.subarray(0, chunkSize))
            this.consume(client, chunkSize)
            client.receiving.payloadReceived += chunkSize

            this.onPayloadChunk(client, payload)
            return true
        }

        return false
    }
}

module.exports = FrameParser
