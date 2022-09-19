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

            socket.send = function (client, data) {      //data must be a buffer!
                client.sendBytes(data)
            }
        });

        serverHTTP.on('listening', function () {
            console.log('[WebSocket] Nooby running on ' + serverHTTP.address().address + ':' + serverHTTP.address().port)
        });

        serverHTTP.listen(port);
    }
}

module.exports = SocketWeb