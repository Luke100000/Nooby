class SocketWEB {
    constructor(wrapper, port) {
        const http = require('http');
        const WebSocketServer = require('websocket').server;
        const serverHTTP = http.createServer();
        var serverWEB = new WebSocketServer({
            httpServer: serverHTTP
        });

        serverWEB.on('request', function(request) {
            const connection = request.accept(null, request.origin);
            connection.on('message', function(message) {
              console.log('Received Message:', message.utf8Data);
              connection.sendUTF('Hi this is WebSocket server!');
            });
            connection.on('close', function(reasonCode, description) {
                console.log('Client has disconnected.');
            });
        });
        serverHTTP.on('listening', function(){console.log('[WEB] Nooby running on ' + serverHTTP.address().address + ':' + serverHTTP.address().port)})
        serverHTTP.listen(port);
    }

    send = function(client, data){
        
    }

    
}

module.exports = SocketWEB