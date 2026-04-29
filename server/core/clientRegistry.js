class ClientRegistry {
    constructor() {
        this.clients = []
    }

    add(client) {
        this.clients.push(client)
    }

    remove(client) {
        const index = this.clients.indexOf(client)
        if (index < 0) return false
        this.clients.splice(index, 1)
        return true
    }

    all() {
        return this.clients
    }

    count() {
        return this.clients.length
    }
}

module.exports = ClientRegistry
