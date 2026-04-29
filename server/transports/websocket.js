const http = require("http")
const WebSocketServer = require("websocket").server
const ClientConnection = require("../core/clientConnection.js")

class WebSocketTransport {
    constructor(connectionManager, port) {
        const server = http.createServer()
        const webSocketServer = new WebSocketServer({
            httpServer: server,
        })

        webSocketServer.on("request", function (request) {
            const socket = request.accept(null, request.origin)
            const client = new ClientConnection({
                id: request.remoteAddress || "websocket",
                type: "WebSocket",
                raw: socket,
                write: function (data) {
                    if (data instanceof Buffer) {
                        socket.sendBytes(data)
                    } else if (data instanceof Uint8Array) {
                        socket.sendBytes(Buffer.from(data))
                    } else {
                        socket.sendBytes(data)
                    }
                },
                close: function () {
                    // The WebSocket library handles close after the event fires.
                },
            })

            connectionManager.newClient(client)

            socket.on("message", function (message) {
                connectionManager.receive(client, message.binaryData)
            })

            socket.on("close", function () {
                connectionManager.logger.log("[WebSocket] Client has disconnected.")
                connectionManager.destroyClient(client, "close")
            })
        })

        server.on("listening", function () {
            console.log("[WebSocket] Nooby running on " + server.address().address + ":" + server.address().port)
        })

        server.listen(port)
        this.server = server
    }
}

module.exports = WebSocketTransport
