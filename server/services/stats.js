class StatsService {
    constructor() {
        this.stats = {
            outgoingMessages: 0,
            incomingMessages: 0,
            outgoingBytes: 0,
            incomingBytes: 0,
            newConnections: 0,
        }
    }

    add(type, n = 1) {
        if (!(type in this.stats)) {
            throw new Error(`Unknown stats key: ${type}`)
        }
        this.stats[type] += n
    }

    get() {
        return {...this.stats}
    }
}

module.exports = StatsService