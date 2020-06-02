class Msg {
    constructor(json, data) {
        this.length = 0    //length of header
        this.size = 0      //length of data segment
        this.json = json   //header
        this.data = data   //data segment
    }
}

class Wrapper {
    constructor(cfg, callbacks) {
        this.clients = []
        this.lastID = 0

        this.cfg = cfg
        this.callbacks = callbacks

        new (require("./sockets/tcp.js"))(this, cfg.portTCP)      //include tcp socket
        new (require("./sockets/udp.js"))(this, cfg.portUDP)      //include udp socket
        new (require("./sockets/web.js"))(this, cfg.portWEB)      //include web socket

        setInterval(function (self) {
            let now = new Date();
            let check = 0
            self.clients.forEach(function (client) {
                if (now - client.lastMsg > cfg.checkAlive) {
                    self.checkAlive(client)
                    check++;
                }
            })
            self.callbacks._log("checkAlive for devices:" + self.clients.length, "send to:"+check)
        }, cfg.checkAlive, this)
    }

    //generate unique ids
    getID = function () {
        this.lastID++;
        return this.lastID;
    }

    newClient = function (client) {
        let self = this

        client.buffer = Buffer.allocUnsafe(this.cfg.bufferSize);
        client.bytesReceived = 0

        client.lastMsg = new Date();

        client.userId = self.getID()
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

        client.lastMsg = new Date();

        //append data
        client.bytesReceived += data.copy(client.buffer, client.bytesReceived)

        //either wait until packet is there or start processing new data
        while (true) {
            if (client.receiving) {
                //currently parsing incoming message
                if (client.receiving.awaiting_json) {
                    if (client.bytesReceived >= client.receiving.length) {
                        let json = client.buffer.slice(0, client.receiving.length).toString()
                        client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.length, client.bytesReceived)
                        client.receiving.awaiting_json = false
                        try {
                            client.receiving.json = JSON.parse(json);
                            client.receiving.size = client.receiving.json.l
                        } catch (err) {
                            self.destroySocket(client, "JSON_malformed")
                            this.callbacks._log("[JSON] error:", json)
                            return
                        }
                    } else {
                        //wait
                        break
                    }
                } else if (client.receiving.awaiting_data) {
                    if (client.bytesReceived >= client.receiving.size) {
                        client.receiving.data = client.buffer.slice(0, client.receiving.size).toString()
                        client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.size, client.bytesReceived)
                        client.receiving.awaiting_data = false
                    } else {
                        //wait
                        break
                    }
                } else {
                    //if there is no json, create json
                    if (!client.receiving.json) client.receiving.json = {}

                    //done
                    client.receiving.json.cmd = client.receiving.json.c || client.receiving.json.cmd || "msg"
                    this.callbacks.receive(client, client.receiving)
                    client.receiving = false
                }
            } else {
                //wait for first 4 bytes
                if (client.bytesReceived >= 4) {
                    let type = client.buffer.readUInt8(0)
                    let length = client.buffer.readUInt8(1) * 256 * 256 + client.buffer.readUInt8(2) * 256 + client.buffer.readUInt8(3)

                    //cut away type and length
                    client.bytesReceived = client.buffer.copy(client.buffer, 0, 4, client.bytesReceived)

                    //start new message
                    client.receiving = new Msg()

                    switch (type) {
                        case 0:
                            //json and data
                            client.receiving.length = length
                            client.receiving.awaiting_json = true
                            client.receiving.awaiting_data = true
                            break
                        case 1:
                            //client side only
                            client.destroySocket()
                            return
                        case 2:
                            //data only
                            client.receiving.length = 0
                            client.receiving.size = length
                            client.receiving.awaiting_data = true
                            break
                        case 3:
                            //json only
                            client.receiving.length = length
                            client.receiving.awaiting_json = true
                            break
                        case 4:
                            //ping
                            client.receiving = false
                            break
                        case 5:
                            //tag only
                            //WIP
                            client.receiving.length = 0
                            client.receiving.size = length
                            client.receiving.awaiting_tag = true
                            client.receiving.awaiting_data = true
                            client.destroySocket()
                            return
                    }
                } else {
                    break
                }
            }
        }
    }

    //notify all clients of nooby shutdown
    shutdown = function () {
        let self = this
        this.clients.forEach(client => self.send(client, {"info": "Nooby shutdown"}, ""));
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
        let isEmptyJSON = function (json) {
            if (json == null) {
                return true
            } else {
                try {
                    return Object.keys(json).length === 0
                } catch (err) {
                    console.log(err);
                    return true
                }
            }
        }

        let isEmptyString = function (str) {
            return str == null || str.length === 0;
        }

        //converts a positive integer (max 65536) to a 3 bytes string
        let intTo3Bytes = function (l) {
            return String.fromCharCode(Math.floor(l / 65536)) + String.fromCharCode(Math.floor(l / 256) % 256) + String.fromCharCode(l % 256);
        }

        if(!isEmptyJSON(msg.json))
            delete msg.json.cmd //delete cmd. should not send to user

        //extract send user
        let user = false
        if(!isEmptyJSON(msg.json)){
            user = msg.json.user
            delete msg.json.user
        }

        let no_JSON = isEmptyJSON(msg.json)
        let no_DATA = isEmptyString(msg.data)

        //determine type
        let type = -1
        if (!no_JSON && !no_DATA) {
            type = 0
        } else if (user && !no_DATA){
            type = 1
        } else if (no_JSON && !no_DATA) {
            type = 2
        } else if (!no_JSON && no_DATA) {
            type = 3
        } else if (no_JSON && no_DATA) {
            type = 4 //ping
        } else {
            return false;
        }

        //type char
        let tc = String.fromCharCode(type);

        //pack
        let data_json
        switch (type) {
            case 0:
                msg.json.l = msg.data.length
                data_json = JSON.stringify(msg.json)
                return tc + intTo3Bytes(data_json.length) + data_json + msg.data
            case 1:
                return tc + intTo3Bytes(msg.data.length) + intTo3Bytes(user) + msg.data
            case 2:
                return tc + intTo3Bytes(msg.data.length) + msg.data
            case 3:
                data_json = JSON.stringify(msg.json)
                return tc + intTo3Bytes(data_json.length) + data_json
            case 4:
                return tc + intTo3Bytes(msg.length)
        }

        //not implemented type
        return false
    }

    send = function (client, json, data) {
        let self = this
        let packet = self.msgToPacket(new Msg(json, data))
        if (packet) {
            client.send(client, packet)
            return packet.length
        } else {
            return 0
        }
    }

    sendPacket = function (client, packet) {
        if(packet){
            client.send(client, packet)
            return packet.length
        }else{
            return 0
        }
    }
}

module.exports = {
    Wrapper,
    Msg,
}