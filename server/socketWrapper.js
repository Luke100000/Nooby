class Msg {
    constructor(header, data) {
        this.length = 0         //length of header
        this.size = 0           //size of data
        this.header = header    //header
        this.data = data        //data segment
        this.awaitingHeader = true
        this.awaitingData = true
    }
}

let isEmptyString = function (str) {
    return str == null || str.length === 0;
}

//converts a positive integer (max 65536) to a 3 bytes string
let intTo3Bytes = function (l) {
    return String.fromCharCode(Math.floor(l / 65536)) + String.fromCharCode(Math.floor(l / 256) % 256) + String.fromCharCode(l % 256);
}

let msgpack = require("./msgpack.js")

class Wrapper {
    constructor(cfg, callbacks) {
        if (cfg == null && callbacks == null) return
        this.clients = []

        this.cfg = cfg
        this.callbacks = callbacks

        new (require("./sockets/tcp.js"))(this, cfg.portTCP)        //include tcp socket
        new (require("./sockets/udp.js"))(this, cfg.portUDP)        //include udp socket
        new (require("./sockets/web.js"))(this, cfg.portWEB)        //include web socket

        if (cfg.checkAlive) {                                       //only check alive when defined
            setInterval(function (self) {
                let now = new Date();
                let check = 0
                self.clients.forEach(function (client) {
                    if (now - client.lastMsg > cfg.checkAlive) {
                        self.checkAlive(client)
                        check++;
                    }
                })
                if (check)
                    self.callbacks._log("checkAlive for devices:" + self.clients.length, "send to:" + check)
            }, cfg.checkAlive, this)
        }
    }

    newClient = function (client) {
        client.buffer = Buffer.allocUnsafe(this.cfg.bufferSize);
        client.bytesReceived = 0

        client.lastMsg = new Date();

        this.callbacks._log("New client: " + client.userId + " at " + (new Date().toISOString()))

        this.clients.push(client)
        this.callbacks.newClient(client)
    }

    checkAlive = function (client) {
        let self = this

        let packet = self.msgToPacket(new Msg())
        self.sendPacket(client, packet)
    }

    receive = function (client, data) {
        let self = this

        client.lastMsg = new Date()

        //extend buffer if necessary
        if (client.bytesReceived + data.length > client.buffer.length) {
            let oldBuffer = client.buffer
            client.buffer = Buffer.allocUnsafe(client.bytesReceived + data.length);
            oldBuffer.copy(client.buffer, 0, client.bytesReceived)
            this.callbacks._log("Increased buffer size for client " + client.userId + " to " + (client.bytesReceived + data.length) + " bytes")
        }

        //append data
        client.bytesReceived += data.copy(client.buffer, client.bytesReceived)

        //either wait until packet is there or start processing new data
        while (true) {
            if (client.receiving) {
                //parsing current incoming message
                if (client.receiving.awaitingHeader) {
                    if (client.bytesReceived >= client.receiving.length) {
                        let header = client.buffer.slice(0, client.receiving.length)
                        try {
                            //msgpack
                            client.receiving.header = msgpack.decode(header)
                            client.receiving.size = client.receiving.header.l || 0
                        } catch (err) {
                            self.destroySocket(client, "JSON_malformed")
                            this.callbacks._log("[JSON] error:", header)
                            return
                        }
                        client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.length, client.bytesReceived)
                        client.receiving.awaitingHeader = false

                        //no data to receive
                        if (client.receiving.size === 0) {
                            client.receiving.awaitingData = false
                        }
                    } else {
                        //wait
                        break
                    }
                } else if (client.receiving.awaitingData) {
                    if (client.bytesReceived >= client.receiving.size) {
                        client.receiving.data = Buffer.from(client.buffer.slice(0, client.receiving.size))
                        client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.size, client.bytesReceived)
                        client.receiving.awaitingData = false
                    } else {
                        //wait
                        break
                    }
                } else {
                    //done
                    client.receiving.header.c = client.receiving.header.c || "m"
                    this.callbacks.receive(client, client.receiving)
                    client.receiving = false
                }
            } else {
                //wait for first 4 bytes
                if (client.bytesReceived >= 3) {
                    let length = client.buffer.readUInt8(0) * 256 * 256 + client.buffer.readUInt8(1) * 256 + client.buffer.readUInt8(2)

                    //cut away type and length
                    client.bytesReceived = client.buffer.copy(client.buffer, 0, 3, client.bytesReceived)

                    //start new message
                    client.receiving = new Msg()
                    client.receiving.length = length
                } else {
                    break
                }
            }
        }
    }

    //notify all clients of nooby shutdown
    shutdown = function () {
        let self = this
        this.clients.forEach(client => self.send(client, {"c": "shutdown"}));
    }

    //destroys a socket and removes it from the client list
    destroySocket = function (client, info) {
        //todo close actual socket to prevent further communication
        let i = this.clients.indexOf(client)
        if (i != null) {
            this.clients.splice(i)
            this.callbacks.destroySocket(client, info)
        }
    }

    //pack a msg object into a string
    msgToPacket = function (msg) {
        if (isEmptyString(msg.data)) {
            let data_header = msgpack.encode(msg.header)
            let buf = Buffer.from(intTo3Bytes(data_header.length))
            return Buffer.concat([buf, data_header], buf.length + data_header.length)
        } else {
            msg.header.l = msg.data.length
            let data_header = msgpack.encode(msg.header)
            let buf = Buffer.from(intTo3Bytes(data_header.length))
            return Buffer.concat([buf, data_header, msg.data], buf.length + data_header.length + msg.data.length)
        }
    }

    send = function (client, header, data) {
        let self = this
        let packet = self.msgToPacket(new Msg(header, data))
        if (packet) {
            client.send(client, packet)
            return packet.length
        } else {
            return 0
        }
    }

    sendPacket = function (client, packet) {
        if (packet) {
            client.send(client, packet)
            return packet.length
        } else {
            return 0
        }
    }
}

module.exports = {
    Wrapper,
    Msg,
}