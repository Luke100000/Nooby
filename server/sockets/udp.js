class SocketUDP {
    constructor(wrapper, port) {
        var serverUDP = require('dgram').createSocket('udp4');

        //udp has no client management. everyone can send and receive everytime
		serverUDP.on('connection', function(socket){
			socket.setRecvBufferSize(cfg.buffer_size)
			socket.setSendBufferSize(cfg.buffer_size)
			
			//_log('New client: ' + socket.remoteAddress + ':' + socket.remotePort + ' at ' + (new Date().toISOString()))
			serverUDP.on('message', function(dataRaw, info){
				
			})
			
		}) //end of serverUDP.on 'connection'
		serverUDP.on('listening', function(){console.log('[UDP] Nooby running on ' + serverUDP.address().address + ':' + serverUDP.address().port)})
		serverUDP.bind(port)
    }

    send = function(client, data){
        
    }

    
}

module.exports = SocketUDP