class ChannelStore {
    constructor(log) {
        this.channels = {}
        this.lastChannelId = 0
        this.log = log
    }

    createPrivateName() {
        return (this.lastChannelId++).toString()
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
