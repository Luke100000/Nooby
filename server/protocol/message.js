const ParserState = {
    HEADER: 1,
    PAYLOAD: 2,
    DONE: 3,
}

class Message {
    constructor(header, payloadMessage) {
        this.headerSize = 0
        this.payloadSize = payloadMessage && payloadMessage.payloadSize || 0
        this.header = header
        this.headerPacket = null
        this.payloadMessage = payloadMessage
        this.state = ParserState.HEADER
        this.payloadReceived = 0
        this.listeners = []
    }
}

module.exports = {
    Message,
    ParserState,
}
