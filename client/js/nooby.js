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
 * let noobyClient = new nooby
 *
 * @authors
 * Luke100000
 * Thecoolpeople
 *
 * @license MIT
 *
 **/

class nooby{
    init(wrapper, ip, port, compress) {
        self = this
        this.compress = compress || true
        if(wrapper.log == null) wrapper.log = console.log
        this.ip = ip
        this.port = port
        this.connection = new WebSocket('ws://' + ip + ":" + port, ['soap', 'xmpp']);

        // When the connection is open, send some data to the server
        this.connection.onopen = function () {
            wrapper.log("[nooby] WebSocket is open now.");
        };

        // Log errors
        this.connection.onerror = function (error) {
            wrapper.log('[nooby] WebSocket Error ', error);
        };

        // Log messages from the server
        this.connection.onmessage = function (e) {
            let msg = {};
            (async () => {
                let buf = await self.readBlobAsync(e.data)
                let viewBuf = new DataView(buf);
                msg.type = viewBuf.getUint8(0);
                let length = viewBuf.getUint8(1) * 256 * 256 + viewBuf.getUint8(2) * 256 + viewBuf.getUint8(3)
                switch (msg.type) {
                    case 0: {
                        let json = self.binary2text(buf.slice(4, 4 + length))
                        msg.json = JSON.parse(json)
                        msg.data = buf.slice(4 + length, 4 + length + msg.json.l)
                    }
                        break;
                    case 1: {
                        msg.user = viewBuf.getUint8(4) * 256 * 256 + viewBuf.getUint8(5) * 256 + viewBuf.getUint8(6)
                        msg.data = buf.slice(7, 7 + length)
                    }
                        break;
                    case 2: {
                        msg.data = buf.slice(4, 4 + length)
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
                //uncompress
                if(msg.data){
                    buf = new Uint8Array(msg.data)
                    if(buf[0] == 4){
                        msg.data = self.binary2text(lz4.decompress(buf))
                        msg.json.l = msg.data.length
                    }
                    else
                        msg.data = self.binary2text(msg.data)
                }
                wrapper.onmessage(msg)
            })();
        };
    }

    readBlobAsync(blob) {
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
        
            reader.onload = () => {
            resolve(reader.result);
            };
        
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        })
    }

    //send Packet
    sendPacket(data) {
        self = this
        if (noobyClient.connection.readyState === 3) self.init(wrapper, this.ip, this.port)
        if (noobyClient.connection.readyState !== 1) return;
        this.connection.send(data)
    }

    //send Message
    send(msg) {
        self = this
        let msgpack = self.msgToPacket(msg)
        let binary = self.text2binary(msgpack)
        self.sendPacket(binary)
    }

    connect(channel) {
        self = this
        if (channel != null)
            self.send({json: {"cmd": "c", "channel": channel}})
        else
            self.send({json: {"cmd": "c", "channel": ""}})
    }
    
    ping() {
        self = this
        self.send({length: 0})
    }

    //TOOLS
    binary2text(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    text2binary(str) {
        let buf = new ArrayBuffer(str.length); // 2 bytes for each char
        let bufView = new Uint8Array(buf);
        let i = 0, strLen = str.length;
        for (; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    //pack a msg object into a string
    msgToPacket(msg) {
        let isEmptyJSON = function (json) {
            if (json == null) {
                return true
            } else {
                try {
                    return Object.keys(json).length === 0
                } catch (err) {
                    wrapper.log(err);
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

        //compress
        if(!no_DATA && this.compress){
            let buf = lz4.compress(new Uint8Array(this.text2binary(msg.data)))
            msg.data = this.binary2text(buf)
        }
        
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