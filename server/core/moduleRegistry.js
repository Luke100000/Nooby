const fs = require("fs")
const path = require("path")

class ModuleRegistry {
    constructor(directory) {
        this.directory = directory
        this.modules = {}
        this.aliases = {}
    }

    load(context) {
        const files = fs.readdirSync(this.directory).filter(function (file) {
            return file.endsWith(".js")
        }).sort()

        for (const file of files) {
            const name = path.basename(file, ".js")
            console.log("[Module] load " + name)

            const modulePath = path.join(this.directory, file)
            const packetModule = require(modulePath)
            this.register(name, packetModule)

            if (packetModule.init) {
                packetModule.init(context)
            }
        }
    }

    register(name, packetModule) {
        if (this.modules[name]) {
            throw new Error("Duplicate module name: " + name)
        }

        if (packetModule.receive && typeof packetModule.receive !== "function") {
            throw new Error("Invalid receive function in module: " + name)
        }
        if (packetModule.init && typeof packetModule.init !== "function") {
            throw new Error("Invalid init function in module: " + name)
        }
        if (packetModule.destroyClient && typeof packetModule.destroyClient !== "function") {
            throw new Error("Invalid destroyClient function in module: " + name)
        }
        const aliases = packetModule.aliases || []
        if (!Array.isArray(aliases)) {
            throw new Error("Invalid aliases array in module: " + name)
        }

        this.addAlias(name, name, packetModule)
        for (const alias of aliases) {
            this.addAlias(name, alias, packetModule)
        }

        packetModule.aliases = aliases
        this.modules[name] = packetModule
    }

    addAlias(name, alias, packetModule) {
        if (this.aliases[alias]) {
            throw new Error("Duplicate module alias '" + alias + "' in module: " + name)
        }
        this.aliases[alias] = packetModule
    }

    get(name) {
        return this.aliases[name]
    }

    destroyClient(context, client) {
        for (const name in this.modules) {
            const packetModule = this.modules[name]
            if (packetModule.destroyClient) {
                packetModule.destroyClient(context, client)
            }
        }
    }
}

module.exports = ModuleRegistry
