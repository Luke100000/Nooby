/**
 *   _   _  ____   ____  ______     __
 *  | \ | |/ __ \ / __ \|  _ \ \   / /
 *  |  \| | |  | | |  | | |_) \ \_/ /
 *  | . ` | |  | | |  | |  _ < \   /
 *  | |\  | |__| | |__| | |_) | | |
 *  |_| \_|\____/ \____/|____/  |_|

 * Opensource multiplayer and network messaging for CoronaSDK, Moai, Gideros & LÖVE
 *
 * @usage
 * todo
 *
 * @authors
 * Luke100000
 * Thecoolpeople
 *
 * @license MIT
 *
 **/

class nooby {
    init = function (wrapper, ip, port) {
        self = this
        this.ip = ip
        this.port = port
        this.connection = new WebSocket('ws://' + ip + ":" + port, ['soap', 'xmpp']);

        // When the connection is open, send some data to the server
        this.connection.onopen = function () {
            console.log("[nooby] WebSocket is open now.");
        };

        // Log errors
        this.connection.onerror = function (error) {
            console.log('[nooby] WebSocket Error ', error);
        };

        // Log messages from the server
        this.connection.onmessage = function (e) {
            let msg = {};
            (async () => {
                let buf = await e.data.arrayBuffer();
                let viewBuf = new DataView(buf);
                msg.type = viewBuf.getUint8(0);
                let length = viewBuf.getUint8(1) * 256 * 256 + viewBuf.getUint8(2) * 256 + viewBuf.getUint8(3)
                switch (msg.type) {
                    case 0: {
                        let json = self.binary2text(buf.slice(4, 4 + length))
                        msg.json = JSON.parse(json)
                        msg.data = self.binary2text(buf.slice(4 + length, 4 + length + 1 + msg.json.l))
                    }
                        break;
                    case 1: {
                        msg.user = viewBuf.getUint8(4) * 256 * 256 + viewBuf.getUint8(5) * 256 + viewBuf.getUint8(6)
                        msg.data = self.binary2text(buf.slice(7, 7 + length))
                    }
                        break;
                    case 2: {
                        msg.data = self.binary2text(buf.slice(4, 4 + length))
                    }
                        break;
                    case 3: {
                        let json = self.binary2text(buf.slice(4, 4 + length))
                        msg.json = JSON.parse(json)
                    }
                        break;
                    case 4:
                        msg.i = length
                        if (msg.i === 0) {
                            self.ping();
                            return
                        }
                        break;
                }
                wrapper.onmessage(msg)
            })();
        };
    }

    //send Packet
    sendPacket = function (data) {
        self = this
        if (noobyClient.connection.readyState === 3) self.init(wrapper, this.ip, this.port)
        if (noobyClient.connection.readyState !== 1) return;
        this.connection.send(data)
    }

    //send Message
    send = function (msg) {
        self = this
        let msgpack = self.msgToPacket(msg)
        let binary = self.text2binary(msgpack)
        self.sendPacket(binary)
    }

    connect = function (channel) {
        self = this
        if (channel != null)
            self.send({json: {"cmd": "c", "channel": channel}})
        else
            self.send({json: {"cmd": "c", "channel": ""}})
    }
    ping = function () {
        self = this
        self.send({length: 0})
    }

    //TOOLS
    binary2text = function (buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    text2binary = function (str) {
        const buf = new ArrayBuffer(str.length); // 2 bytes for each char
        const bufView = new Uint8Array(buf);
        let i = 0, strLen = str.length;
        for (; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
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

        let no_JSON = isEmptyJSON(msg.json)
        let no_DATA = isEmptyString(msg.data)

        //determine type
        let type = -1
        if (!no_JSON && !no_DATA) {
            type = 0
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
                //user side only
                return false
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
}