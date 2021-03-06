class SocketTCP {
    constructor(wrapper, port) {
        let serverTCP = require('net').createServer();

        serverTCP.on('connection', function (socket) {
            socket.setNoDelay(true)
            socket.setKeepAlive(true, 300 * 1000)
            socket.isConnected = true

            //register client
            wrapper.newClient(socket)

            // dataRaw is an instance of Buffer as well
            socket.on('data', function (dataRaw) {
                wrapper.receive(socket, dataRaw)
            })

            socket.on('error', function () {
                wrapper.destroySocket(socket, "error")
            })
            socket.on('close', function () {
                wrapper.destroySocket(socket, "close")
            })

            socket.type = "TCP"

            socket.ID = socket.remoteAddress

            socket.send = function (client, data) {
                client.write(data)
            }
        }) //end of serverTCP.on 'connection'

        serverTCP.on('listening', function () {
            console.log('[TCP] Nooby running on ' + serverTCP.address().address + ':' + serverTCP.address().port)
        })
        serverTCP.listen(port, '::')
    }
}

module.exports = SocketTCP