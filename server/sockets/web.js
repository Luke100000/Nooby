class SocketWeb {
    constructor(wrapper, port) {
        const http = require('http');
        const WebSocketServer = require('websocket').server;
        const serverHTTP = http.createServer();
        const webSocketServer = new WebSocketServer({
            httpServer: serverHTTP
        });

        webSocketServer.on('request', function (request) {
            const socket = request.accept(null, request.origin);
            socket.isConnected = true

            //register client
            wrapper.newClient(socket)

            socket.on('message', function (message) {
                wrapper.receive(socket, message.binaryData)
            });
            socket.on('close', function (reasonCode, description) {
                wrapper.callbacks.log('[WebSocket] Client has disconnected.');
                wrapper.destroySocket(socket)
            });

            socket.type = "WebSocket"

            socket.send = function(client, data) {      //data must be a buffer!
                if(data instanceof Buffer){
                    client.sendBytes(data)
                }
                else if(data instanceof Uint8Array){
                    client.sendBytes(Buffer.from(data))
                }
                else{
                    // The following code will result in an error when trying to send
                    client.sendBytes(data)
                }
            }

            socket.end = function(client){
                // The socket will do that for us
            }
        });

        serverHTTP.on('listening', function () {
            console.log('[WebSocket] Nooby running on ' + serverHTTP.address().address + ':' + serverHTTP.address().port)
        });

        serverHTTP.listen(port);
    }
}

module.exports = SocketWeb