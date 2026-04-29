class ChannelStore {
    constructor(log) {
        this.channels = {}
        this.lastChannelId = 0
        this.log = log
    }

    createPrivateName() {
        let channelName
        do {
            channelName = (this.lastChannelId++).toString()
        } while (this.channels[channelName] != null)

        return channelName
    }

    get(channelName) {
        return this.channels[channelName]
    }

    ensure(channelName) {
        if (this.channels[channelName] == null) {
            this.channels[channelName] = {
                name: channelName,
                description: "",
                game: "unknown",
                password: null,
                visible: false,
                clients: [],
                tags: {},
                lastUserId: 0,
            }

            this.log("Channel created: ", channelName)
        }

        return this.channels[channelName]
    }

    removeIfEmpty(channelName) {
        const channel = this.channels[channelName]
        if (channel && channel.clients.length === 0) {
            delete this.channels[channelName]
        }
    }

    removeClient(channelName, client) {
        const channel = this.channels[channelName]
        if (!channel) return null

        const index = channel.clients.indexOf(client)
        if (index >= 0) {
            channel.clients.splice(index, 1)
        }
        delete channel.tags[client.userId]

        return channel
    }

    assignUserId(channel) {
        if (channel.clients.length >= 0x10000) return null

        const usedIds = {}
        for (const client of channel.clients) {
            usedIds[client.userId] = true
        }

        for (let offset = 0; offset <= 0xFFFF; offset++) {
            const userId = (channel.lastUserId + offset) & 0xFFFF
            if (!usedIds[userId]) {
                channel.lastUserId = (userId + 1) & 0xFFFF
                return userId
            }
        }

        return null
    }

    visible(game) {
        const channels = []

        for (const channelName in this.channels) {
            const channel = this.channels[channelName]
            if (channel.visible && (!game || game === channel.game)) {
                channels.push({
                    channel: channelName,
                    name: channel.name,
                    description: channel.description,
                    password: !!channel.password,
                    clients: channel.clients.length,
                })
            }
        }

        return channels
    }
}

module.exports = ChannelStore
