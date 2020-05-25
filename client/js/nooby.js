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

class nooby{
    init = function(wrapper, ip, port){
        this.connection = new WebSocket('ws://'+ip+":"+port, ['soap', 'xmpp']);
        //send
        this.send = function(data){
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
            console.log('WebSocket Error ' + error);
        };
        // Log messages from the server
        this.connection.onmessage = function (e) {
            let type = e.data[0];
            switch(type){
                case 0:

                break;
                case 1:

                break;
                case 2:

                break;
                case 3:

                break;
                case 4:

                break;
            }
            wrapper.onmessage(e)
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
        console.log(buffer)
    }

    binary2text = function(buf) {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
      }

      
    text2binary = function (string) {
        var buf = new ArrayBuffer(string.length); // 2 bytes for each char
        var bufView = new Uint8Array(buf);
        for (var i=0, strLen=string.length; i < strLen; i++) {
            bufView[i] = string.charCodeAt(i);
        }
        return buf;
    }
}