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

let msgpack = require("msgpack-js")

// the headers max size
let maxBufferSize = 256 * 256
let minPacketSize = 1024

class Wrapper {
    constructor(cfg, callbacks) {
        this.clients = []

        this.callbacks = callbacks

        // launch sockets
        new (require("./sockets/tcp.js"))(this, cfg.portTCP)
        new (require("./sockets/web.js"))(this, cfg.portWebSocket)
    }

    newClient = function (client) {
        client.buffer = Buffer.allocUnsafe(maxBufferSize * 2 + 12);
        client.bytesReceived = 0

        this.callbacks.log("New client: " + client.ID + " at " + (new Date().toISOString()))

        this.clients.push(client)
        this.callbacks.newClient(client)
    }

    receive = function (client, data) {
		try {
			this.receiveInner(client, data)
		} catch (error) {
			console.log(error)
			this.destroySocket(client, "error")
		}
	}

    receiveInner = function (client, data) {
        let self = this

        //append data
        client.bytesReceived += data.copy(client.buffer, client.bytesReceived)

        //either wait until packet is there or start processing new data
        while (true) {
            if (!client.receiving) {
                //wait for first 6 bytes
                if (client.bytesReceived >= 6) {
                    //start new message
                    client.receiving = new Message(client)

                    //parse lengths
                    client.receiving.headerSize = client.buffer.readUInt16BE(0)
                    client.receiving.payloadSize = client.buffer.readUint32BE(2)

                    //cut length
                    client.bytesReceived = client.buffer.copy(client.buffer, 0, 6, client.bytesReceived)
                } else {
                    break
                }
            } else if (client.receiving.state === ParserState.HEADER) {
                //parsing current incoming message
                if (client.bytesReceived >= client.receiving.headerSize) {
                    if (client.receiving.headerSize === 0) {
                        client.receiving.header = {"m": "message"}
                    } else {
                        let header = client.buffer.subarray(0, client.receiving.headerSize)
                        client.receiving.header = msgpack.decode(header)
                        client.receiving.header.m = client.receiving.header.m || "message"
                        client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.headerSize, client.bytesReceived)
                    }

                    //process packet and stream the payload later
                    this.callbacks.receive(client, client.receiving)

                    //next state
                    client.receiving.state = ParserState.PAYLOAD
                } else {
                    break
                }
            } else if (client.receiving.state === ParserState.PAYLOAD) {
                //receive and forward payload
                if (client.receiving.payloadSize === 0 || client.receiving.payloadReceived === client.receiving.payloadSize) {
                    client.receiving.state = ParserState.DONE
                    client.receiving = false
                } else {
                    let remaining = client.receiving.payloadSize - client.receiving.payloadReceived
                    let chunk = Math.min(remaining, client.bytesReceived, 256 ** 2)
                    if (chunk >= minPacketSize || chunk === remaining) {
                        let payload = Buffer.from(client.buffer.subarray(0, chunk))
                        client.bytesReceived = client.buffer.copy(client.buffer, 0, chunk, client.bytesReceived)
                        client.receiving.payloadReceived += chunk

                        //call listener
                        for (const receiver of client.receiving.listeners) {
                            self.sendChunk(receiver, client, payload)
                        }
                    } else {
                        break
                    }
                }
            } else {
                break
            }
        }
    }

    //notify all clients of nooby shutdown
    shutdown = function () {
        let self = this
        this.clients.forEach(client => self.sendMessage(client, client, new Message({"m": "shutdown"})));
    }

    //destroys a socket and removes it from the client list
    destroySocket = function (client, info) {
        let i = this.clients.indexOf(client)
        if (i >= 0) {
            this.clients.splice(i, 1)
            this.callbacks.destroySocket(client, info)
            client.end()
        }
    }

    //pack a message object into a buffer
    messageToPacket = function (message) {
        if (message.header) {
            let header = msgpack.encode(message.header)
            let size = new Uint8Array([
                (header.length >> 8) & 0xFF, (header.length) & 0xFF, // header length
                (message.payloadSize >> 24) & 0xFF, (message.payloadSize >> 16) & 0xFF, (message.payloadSize >> 8) & 0xFF, (message.payloadSize) & 0xFF // payload length
            ])
            return Buffer.concat([size, header], 6 + header.length)
        } else {
            return new Uint8Array([
                0, 0,
                (message.payloadSize >> 24) & 0xFF, (message.payloadSize >> 16) & 0xFF, (message.payloadSize >> 8) & 0xFF, (message.payloadSize) & 0xFF // payload length
            ])
        }
    }

    //send a header-only message
    send = function (receiver, sender, header) {
        let self = this
        self.sendMessage(receiver, sender, new Message(header))
    }

    //send a message
    sendMessage = function (receiver, sender, message) {
        let self = this
        this.callbacks.send(receiver, sender, message)

        //build header binary
        if (!message.headerPacket) {
            message.headerPacket = self.messageToPacket(message)
        }

        //send header
        self.sendChunk(receiver, sender, message.headerPacket)

        //adds a listener to receive the payload
        if (message.payloadMessage) {
            message.payloadMessage.listeners.push(receiver)
        }
    }

    //send a message
    sendChunk = function (receiver, sender, chunk) {
        let size = chunk.length - 1
        receiver.send(receiver, new Uint8Array([
            (sender.userId >> 8) & 0xFF, (sender.userId) & 0xFF, // userid
            (size >> 8) & 0xFF, (size) & 0xFF // chunk length
        ]))
        receiver.send(receiver, chunk)
    }
}

module.exports = {
    Wrapper,
    Message,
}