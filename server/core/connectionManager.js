const FrameParser = require("../protocol/frameParser.js")

class ConnectionManager {
    constructor(options) {
        this.clients = options.clients
        this.moduleRegistry = options.moduleRegistry
        this.router = options.router
        this.stats = options.stats
        this.logger = options.logger

        this.parser = new FrameParser(
            (client, message) => this.router.receive(client, message),
            (client, payload) => this.router.forwardPayloadChunk(client, payload)
        )
    }

    newClient(client) {
        this.parser.initClient(client)
        this.logger.log("New client: " + client.id + " at " + (new Date().toISOString()))
        this.clients.add(client)
        this.stats.add("newConnections", 1)
    }

    receive(client, data) {
        try {
            this.parser.receive(client, data)
        } catch (error) {
            console.log(error)
            this.destroyClient(client, "error")
        }
    }

    destroyClient(client, info) {
        if (this.clients.remove(client)) {
            this.moduleRegistry.destroyClient(this.router.context, client, info)
            client.end()
        }
    }

    shutdown() {
        this.router.shutdown(this.clients.all())
    }
}

module.exports = ConnectionManager
