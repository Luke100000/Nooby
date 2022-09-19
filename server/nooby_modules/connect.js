let init = function (env) {
    env.channels = {}
    env.lastChannelId = 0

    env.lastUserID = 0;
    env.userIds = {}
}

let destroySocket = function (env, client) {
    //disconnect from channel
    if (client.channel) {
        let channel = env.channels[client.channel]
        let i = channel.clients.indexOf(client)
        channel.clients.splice(i, 1)
    }
}

let receive = function (env, client, msg) {
    //assign a unique id since the ID would expose the IP
    client.userId = client.userId || env.lastUserID++

    //disconnect from old channel
    if (client.channel) {
        let channel = env.channels[client.channel]
        let i = channel.clients.indexOf(client)
        channel.clients.splice(i, 1)
    }

    //reset client data
    let tags = {}

    //set new channel name, or random if no name specified
    if (msg.header.channel) {
        client.channel = msg.header.channel.toString()
    } else {
        client.channel = (env.lastChannelId++).toString()

        //private channel, first user is an admin
        tags.admin = true
    }

    //create new channel if not existing
    if (env.channels[client.channel] == null) {
        env.channels[client.channel] = {
            name: tags.admin && msg.header.name || client.channel,
            description: tags.admin && msg.header.description || "",
            clients: [],
            tags: {},
        }

        env.log("Channel created: ", client.channel)
    }

    let channel = env.channels[client.channel]

    //add client to channel
    channel.clients.push(client)
    channel.tags[client.userId] = tags

    //notify other users
    for (const receiver of channel.clients) {
        if (receiver.userId !== client.userId) env.socketWrapper.send(receiver, client, {m: "connected"})
    }
    env.socketWrapper.send(client, client, {m: "connected", channel: client.channel})
}

let aliases = ["c"]

module.exports = {
    init,
    destroySocket,
    receive,
    aliases,
}