class SocketWEB {
    constructor(wrapper, port) {
        const http = require('http');
        const WebSocketServer = require('websocket').server;
        const serverHTTP = http.createServer();
        var serverWEB = new WebSocketServer({
            httpServer: serverHTTP
        });

        serverWEB.on('request', function (request) {
            var socket = request.accept(null, request.origin);
            socket.isConnected = true

            //register client
            wrapper.newClient(socket)

            socket.on('message', function (message) {
                wrapper.receive(socket, message.binaryData)
            });
            socket.on('close', function (reasonCode, description) {
                console.log('[WEB] Client has disconnected.');
                wrapper.destroySocket(socket)
            });

            socket.type = "WEB"

            socket.send = function (client, data) {      //data must be a buffer!
                client.sendBytes(data)
            }
        }); //end of serverTCP.on 'request'
        serverHTTP.on('listening', function () {
            console.log('[WEB] Nooby running on ' + serverHTTP.address().address + ':' + serverHTTP.address().port)
        })
        serverHTTP.listen(port);
    }
}

module.exports = SocketWEB