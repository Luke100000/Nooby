const net = require("net")
const ClientConnection = require("../core/clientConnection.js")

class TcpTransport {
    constructor(connectionManager, port) {
        const server = net.createServer()

        server.on("connection", function (socket) {
            socket.setNoDelay(true)
            socket.setKeepAlive(true, 300 * 1000)

            const client = new ClientConnection({
                id: socket.remoteAddress + ":" + socket.remotePort,
                type: "TCP",
                raw: socket,
                write: function (data) {
                    socket.write(data)
                },
                close: function () {
                    socket.end()
                },
            })

            connectionManager.newClient(client)

            socket.on("data", function (dataRaw) {
                connectionManager.receive(client, dataRaw)
            })

            socket.on("error", function () {
                connectionManager.destroyClient(client, "error")
            })

            socket.on("close", function () {
                connectionManager.destroyClient(client, "close")
            })
        })

        server.on("listening", function () {
            console.log("[TCP] Nooby running on " + server.address().address + ":" + server.address().port)
        })

        server.listen(port, "::")
        this.server = server
    }
}

module.exports = TcpTransport
