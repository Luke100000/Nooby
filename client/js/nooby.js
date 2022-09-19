/**
 *   _   _  ____   ____  ______     __
 *  | \ | |/ __ \ / __ \|  _ \ \   / /
 *  |  \| | |  | | |  | | |_) \ \_/ /
 *  | . ` | |  | | |  | |  _ < \   /
 *  | |\  | |__| | |__| | |_) | | |
 *  |_| \_|\____/ \____/|____/  |_|
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

// Nodejs-like Buffer built-in
let Buffer = require('buffer').Buffer
let LZ4 = require('lz4')

let compress = function (data) {
    let input = new Buffer(data)
    let output = new Buffer(LZ4.encodeBound(input.byteLength))  // Initialize the output buffer to its maximum length based on the input data
    let compressedSize = LZ4.encodeBlock(input, output)     // block compression (no archive format)
    output = output.slice(0, compressedSize)                // remove unnecessary bytes
    return String.fromCharCode.apply(null, output)
}

let decompress = function (cdata, asbuffer) {
    const compressed = new Buffer(cdata);
    let uncompressed = new Buffer(24 + 255 * (compressed.byteLength - 10))       // Initialize the uncompressed buffer to its maximum length based on the compressed data
    let uncompressedSize = LZ4.decodeBlock(compressed, uncompressed)        // block uncompression (no archive format)
    uncompressed = uncompressed.slice(0, uncompressedSize)                  // remove unnecessary bytes
    if (asbuffer)
        return uncompressed
    return String.fromCharCode.apply(null, uncompressed)
}

class NoobyClient {
    status = {
        channel: ""
    }

    init(wrapper, ip, port, compress) {
        self = this

        this.compress = compress || true
        if (wrapper.log == null) wrapper.log = console.log

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
            (async () => {
                //todo outdated, see ReadMe for incoming packages
                let buf = await self.readBlobAsync(e.data)
                let viewBuf = new DataView(buf);
                let headerSize = viewBuf.getUint16(0)
                let payloadSize = viewBuf.getUint32(2)

                let header = buf.slice(6, 6 + headerSize)
                header = msgpack.decode(Buffer.from(header))

                let payload = buf.slice(6 + headerSize, 6 + headerSize + payloadSize)

                //decompress
                if (payload[0] === 1) {
                    payload = decompress(payload.slice(1), true)
                    payload = msgpack.decode(payload)
                } else if (payload[0] === 0) {
                    payload = msgpack.decode(Buffer.from(payload.slice(1)))
                }

                console.log("len", viewBuf.byteLength, headerSize, payloadSize, header, payload)

                header.m = header.m || "message"

                //status
                if (header.m === "connected") {
                    //connected to channel
                    if (header.channel) {
                        self.status.channel = header.channel
                        console.log(self.status)
                    }

                    //new user connected in channel
                    if (header.u) {
                        console.log("New User with ID: " + header.u)
                    }
                }
                wrapper.onmessage(header, payload)
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
    sendMessage(data) {
        self = this
        if (noobyClient.connection.readyState === 3) self.init(wrapper, this.ip, this.port)
        if (noobyClient.connection.readyState !== 1) return;
        this.connection.send(data)
    }

    //send Message
    send(header, payload) {
        self = this
        let msgpack = self.messageToPacket(header, payload)
        let binary = self.text2binary(msgpack)
        self.sendMessage(binary)
    }

    connect(channel) {
        self = this
        if (channel != null)
            self.send({"m": "connect", "channel": channel}, {})
        else
            self.send({"m": "connect"}, {})
    }

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

    //converts a positive integer (max 65536) to a 2 bytes string
    intTo2Bytes = function (l) {
        return String.fromCharCode(Math.floor(l / 256), l % 256);
    }

    intTo4Bytes = function (l) {
        return String.fromCharCode(Math.floor(l / 256 ** 3), Math.floor(l / 256 ** 2) % 256, Math.floor(l / 256) % 256, l % 256);
    }

    //pack a msg object into a string
    messageToPacket(header, payload) {
        let headerData = this.binary2text(msgpack.encode(header))
        let payloadData = this.binary2text(msgpack.encode(payload))

        if (this.compress && payloadData.length >= 128) {
            payloadData = String.fromCharCode(1) + compress(payloadData)
        } else
            payloadData = String.fromCharCode(0) + payloadData

        return this.intTo2Bytes(headerData.length) + this.intTo4Bytes(payloadData.length) + headerData + payloadData
    }
}