const fs = require("fs")
const path = require("path")

const {createLogger} = require("../services/logger.js")
const StatsService = require("../services/stats.js")
const ClientRegistry = require("./clientRegistry.js")
const ChannelStore = require("./channelStore.js")
const ModuleRegistry = require("./moduleRegistry.js")
const MessageRouter = require("./messageRouter.js")
const ConnectionManager = require("./connectionManager.js")
const TcpTransport = require("../transports/tcp.js")
const WebSocketTransport = require("../transports/websocket.js")

function createApp(options) {
    const rootDirectory = options.rootDirectory
    const config = JSON.parse(fs.readFileSync(path.join(rootDirectory, "config.json")))
    const crashLogDirectory = path.join(rootDirectory, "crashlogs")

    if (!fs.existsSync(crashLogDirectory)) {
        fs.mkdirSync(crashLogDirectory)
    }

    const stats = new StatsService(path.join(rootDirectory, "stats"))
    stats.load()

    const logger = createLogger(config)
    const clients = new ClientRegistry()
    const channels = new ChannelStore(logger.log)
    const modules = new ModuleRegistry(path.join(rootDirectory, "modules"))

    const context = {
        config,
        log: logger.log,
        stats,
        clients,
        channels,
        modules: modules.modules,
        router: null,
    }

    const router = new MessageRouter({
        context,
        moduleRegistry: modules,
        stats,
        logger,
        crashLogDirectory,
    })
    context.router = router

    modules.load(context)

    const connectionManager = new ConnectionManager({
        clients,
        moduleRegistry: modules,
        router,
        stats,
        logger,
    })

    return {
        start: function () {
            new TcpTransport(connectionManager, config.portTCP)
            new WebSocketTransport(connectionManager, config.portWebSocket)
        },

        shutdown: function () {
            stats.save()
            connectionManager.shutdown()
        },

        context,
        connectionManager,
    }
}

module.exports = {
    createApp,
}
