class SocketWEB {
    constructor(wrapper, port) {
        const http = require('http');
        const WebSocketServer = require('websocket').server;
        const serverHTTP = http.createServer();
        var serverWEB = new WebSocketServer({
            httpServer: serverHTTP
        });

        serverWEB.on('request', function(request) {
            var socket = request.accept(null, request.origin);
            socket.isConnected = true
            socket.connectionId = wrapper.getID()
            _log('[WEB] New client: ' + socket.connectionId + ' at ' + (new Date().toISOString()))

            //register client
            wrapper.newClient(socket)

            socket.on('message', function(message) {
              console.log('[WEB] Received Message:', message, message.binaryData);
              wrapper.receive(socket, message.binaryData)
            });
            socket.on('close', function(reasonCode, description) {
                console.log('[WEB] Client has disconnected.');
            });

            socket.type = "WEB"

            socket.send = function(client, data) {      //data must be a buffer!
                let buf = Buffer.from(data)
                console.log("[WEB] send", buf)
                client.sendBytes(buf)
            }
        }); //end of serverTCP.on 'request'
        serverHTTP.on('listening', function(){console.log('[WEB] Nooby running on ' + serverHTTP.address().address + ':' + serverHTTP.address().port)})
        serverHTTP.listen(port);
    }
}

module.exports = SocketWEB