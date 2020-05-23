//TCP
serverTCP = require('net').createServer();
//UPD
serverUDP = require('dgram').createSocket('udp4');
//WEB	-> we must use a good 3rd party lib! (this one has 200 000weekly downloads -> should be good..)
const http = require('http');
const WebSocketServer = require('websocket').server;
const serverHTTP = http.createServer();
serverWEB = new WebSocketServer({
    httpServer: serverHTTP
});

////////////		LOAD
//TCP
serverTCP.on('connection', function (socket) {
	socket.setNoDelay(true)
	socket.setKeepAlive(true, 300 * 1000)
	socket.isConnected = true
	socket.connectionId = socket.remoteAddress + '-' + socket.remotePort // unique, used to trim out from sockets hashmap when closing socket
	var arr = new Uint8Array(cfg.buffer_size)
	socket.buffer = Buffer.from(arr.buffer, "binary")
	socket.buffer.len = 0 // due to Buffer's nature we have to keep track of buffer contents ourself

	_log('[TCP] New client: ' + socket.remoteAddress + ':' + socket.remotePort + ' at ' + (new Date().toISOString()))

	socket.on('data', function (dataRaw) { // dataRaw is an instance of Buffer as well
		main.socketData(socket, dataRaw)
	}) //end of socket.on 'data'

	socket.on('error', function () { return destroySocketTCP(socket) })
	socket.on('close', function () { return destroySocketTCP(socket) })
}) //end of serverTCP.on 'connection'
serverTCP.on('listening', function (){console.log('[TCP] Nooby running on ' + serverTCP.address().address + ':' + serverTCP.address().port)})
serverTCP.listen(param.portTCP, '::')

//UDP
//udp has no client management. everyone can send and receive everytime
serverUDP.on('connection', function(socket){
	socket.setRecvBufferSize(cfg.buffer_size)
	socket.setSendBufferSize(cfg.buffer_size)
	
	//_log('New client: ' + socket.remoteAddress + ':' + socket.remotePort + ' at ' + (new Date().toISOString()))
	serverUDP.on('message',function(dataRaw, info){
		
	})
	
}) //end of serverUDP.on 'connection'
serverUDP.on('listening', function(){console.log('[UDP] Nooby running on ' + serverUDP.address().address + ':' + serverUDP.address().port)})
serverUDP.bind(param.portUDP)

//WEB
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
serverHTTP.listen(param.portWEB);

//vars
clientsTCP = {}
clientsUDP = {}
clientsWEB = {}

var checkOnline = function(){		//can be called interval to check if a user is online like every 10seconds (if server got a message in the last 10 seconds, no message is been send)
	
}

//Functions
var autoSend = function(socket){
	
}

var autoReceive = function(socket){
	
}

//Export
module.exports = {
	autoSend,
	autoReceive,
}