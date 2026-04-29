const msgpack = require("msgpack-js")

function encodeMessage(message) {
    if (message.header) {
        const header = msgpack.encode(message.header)
        const size = new Uint8Array([
            (header.length >> 8) & 0xFF, (header.length) & 0xFF,
            (message.payloadSize >> 24) & 0xFF, (message.payloadSize >> 16) & 0xFF, (message.payloadSize >> 8) & 0xFF, (message.payloadSize) & 0xFF,
        ])
        return Buffer.concat([size, header], 6 + header.length)
    }

    return new Uint8Array([
        0, 0,
        (message.payloadSize >> 24) & 0xFF, (message.payloadSize >> 16) & 0xFF, (message.payloadSize >> 8) & 0xFF, (message.payloadSize) & 0xFF,
    ])
}

function encodeChunkHeader(sender, chunk) {
    const size = chunk.length - 1
    return new Uint8Array([
        (sender.userId >> 8) & 0xFF, (sender.userId) & 0xFF,
        (size >> 8) & 0xFF, (size) & 0xFF,
    ])
}

module.exports = {
    encodeMessage,
    encodeChunkHeader,
}
