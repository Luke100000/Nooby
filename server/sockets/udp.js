class SocketUDP {
    constructor(wrapper, port) {
        var serverUDP = require('dgram').createSocket('udp4');

        serverUDP.on('error',function(error){
            console.log('Error: ' + error);
            server.close();
        });

        //udp has no client management. everyone can send and receive everytime
        serverUDP.on('connection', function (socket) {
            socket.setRecvBufferSize(cfg.bufferSize)
            socket.setSendBufferSize(cfg.bufferSize)

            socket.isConnected = true

            //register client
            socket.address = socket.remoteAddress
            socket.port = remotePort
            wrapper.newClient(socket)

            socket.on('message', function (dataRaw, info) {
                wrapper.receive(socket, dataRaw)
            })

            socket.type = "UDP"

            socket.send = function (client, data) {      //data must be a buffer!
                client.send(data, client.port, client.address)
            }

        }) //end of serverUDP.on 'connection'
        serverUDP.on('listening', function () {
            console.log('[UDP] Nooby running on ' + serverUDP.address().address + ':' + serverUDP.address().port)
        })
        serverUDP.bind(port)
    }

    send = function (client, data) {

    }


}

module.exports = SocketUDP