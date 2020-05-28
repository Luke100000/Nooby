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
var noobyTools = {
    binary2text: function(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    },
    text2binary: function(string) {
        var buf = new ArrayBuffer(string.length); // 2 bytes for each char
        var bufView = new Uint8Array(buf);
        for (var i=0, strLen=string.length; i < strLen; i++) {
            bufView[i] = string.charCodeAt(i);
        }
        return buf;
    }
}

class nooby{
    init = function(wrapper, ip, port){
        this.connection = new WebSocket('ws://'+ip+":"+port, ['soap', 'xmpp']);
        //send
        this.send = function(data){
            if(noobyClient.connection.readyState == 3) this.init(wrapper, ip, port)
            if(noobyClient.connection.readyState != 1) return;
            this.connection.send(data)
        }
        // When the connection is open, send some data to the server
        this.connection.onopen = function () {
            console.log("[nooby] WebSocket is open now.");
            //this.send('Ping'); // Send the message 'Ping' to the server
        };
        // Log errors
        this.connection.onerror = function (error) {
            console.log('[nooby] WebSocket Error ' + error);
        };
        self = this
        // Log messages from the server
        this.connection.onmessage = function (e) {
            var msg = {};
            (async () => {
                let buf = await e.data.arrayBuffer();
                let viewBuf = new DataView(buf);
                msg.type = viewBuf.getUint8(0);
                let length = viewBuf.getUint8(1) * 256 * 256 + viewBuf.getUint8(2) * 256 + viewBuf.getUint8(3)
                switch(msg.type){
                    case 0:
                        let json1 = noobyTools.binary2text(buf.slice(4, 4+length))
                        msg.json = JSON.parse(json1)
                        msg.data = noobyTools.binary2text(buf.slice(4+length, 4+length+1+msg.json.l))
                    break;
                    case 1:
                        msg.user = viewBuf.getUint8(4) * 256 * 256 + viewBuf.getUint8(5) * 256 + viewBuf.getUint8(6)
                        noobyTools.binary2text(buf.slice(7, 7+length))
                    break;
                    case 2:
                        msg.data = noobyTools.binary2text(buf.slice(4, 4+length))
                    break;
                    case 3:
                        let json3 = noobyTools.binary2text(buf.slice(4, 4+length))
                        msg.json = JSON.parse(json3)
                    break;
                    case 4:
                        msg.i = length
                        if(msg.i==0){
                            self.ping();
                            return
                        }
                    break;
                }
                wrapper.onmessage(msg)
            })();
        };
    }
    subscribe = function(channel){

    }
    ping = function(){
        var buffer = new ArrayBuffer(4);
        var bufView = new Uint8Array(buffer);
        bufView[0] = 4;
        bufView[1] = 0; bufView[2] = 0; bufView[3] = 0;
        this.send(buffer)
    }
}