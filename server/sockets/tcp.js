class SocketTCP {
    constructor(wrapper, port) {
        let serverTCP = require('net').createServer();

        serverTCP.on('connection', function (socket) {
            socket.setNoDelay(true)
            socket.setKeepAlive(true, 300 * 1000)

            socket.isConnected = true
            socket.type = "TCP"
            socket.ID = socket.remoteAddress + ":" + socket.remotePort

            //register client
            wrapper.newClient(socket)

            // dataRaw is an instance of Buffer as well
            socket.on('data', async function (dataRaw) {
                wrapper.receive(socket, dataRaw)
            })

            socket.on('error', function () {
                wrapper.destroySocket(socket, "error")
            })
            socket.on('close', function () {
                wrapper.destroySocket(socket, "close")
            })

            socket.send = function (client, data) {
                client.write(data)
            }
        })

        serverTCP.on('listening', function () {
            console.log('[TCP] Nooby running on ' + serverTCP.address().address + ':' + serverTCP.address().port)
        })

        serverTCP.listen(port, '::')
    }
}

module.exports = SocketTCP