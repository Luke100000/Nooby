const msgpack = require("msgpack-js")
const {Message, ParserState} = require("./message.js")

const MAX_BUFFER_SIZE = 256 * 256
const MIN_PACKET_SIZE = 1024

class FrameParser {
    constructor(onMessage, onPayloadChunk) {
        this.onMessage = onMessage
        this.onPayloadChunk = onPayloadChunk
    }

    initClient(client) {
        client.buffer = Buffer.allocUnsafe(MAX_BUFFER_SIZE * 2 + 12)
        client.bytesReceived = 0
    }

    receive(client, data) {
        client.bytesReceived += data.copy(client.buffer, client.bytesReceived)

        while (true) {
            if (!client.receiving) {
                if (client.bytesReceived < 6) break

                client.receiving = new Message(null)
                client.receiving.headerSize = client.buffer.readUInt16BE(0)
                client.receiving.payloadSize = client.buffer.readUint32BE(2)
                client.bytesReceived = client.buffer.copy(client.buffer, 0, 6, client.bytesReceived)
            } else if (client.receiving.state === ParserState.HEADER) {
                if (client.bytesReceived < client.receiving.headerSize) break

                if (client.receiving.headerSize === 0) {
                    client.receiving.header = {m: "message"}
                } else {
                    const header = client.buffer.subarray(0, client.receiving.headerSize)
                    client.receiving.header = msgpack.decode(header)
                    client.receiving.header.m = client.receiving.header.m || "message"
                    client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.headerSize, client.bytesReceived)
                }

                this.onMessage(client, client.receiving)
                client.receiving.state = ParserState.PAYLOAD
            } else if (client.receiving.state === ParserState.PAYLOAD) {
                if (client.receiving.payloadSize === 0 || client.receiving.payloadReceived === client.receiving.payloadSize) {
                    client.receiving.state = ParserState.DONE
                    client.receiving = false
                } else {
                    const remaining = client.receiving.payloadSize - client.receiving.payloadReceived
                    const chunkSize = Math.min(remaining, client.bytesReceived, 256 ** 2)

                    if (chunkSize < MIN_PACKET_SIZE && chunkSize !== remaining) break

                    const payload = Buffer.from(client.buffer.subarray(0, chunkSize))
                    client.bytesReceived = client.buffer.copy(client.buffer, 0, chunkSize, client.bytesReceived)
                    client.receiving.payloadReceived += chunkSize

                    this.onPayloadChunk(client, payload)
                }
            } else {
                break
            }
        }
    }
}

module.exports = FrameParser
