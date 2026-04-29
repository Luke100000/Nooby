class ClientConnection {
    constructor(options) {
        this.id = options.id
        this.type = options.type
        this.raw = options.raw
        this.write = options.write
        this.close = options.close

        this.channel = null
        this.userId = 0
        this.receiving = false
        this.buffer = null
        this.bytesReceived = 0
    }

    send(data) {
        this.write(data)
    }

    end() {
        this.close()
    }
}

module.exports = ClientConnection
