let init = function (env) {
    env.channels = {}
    env.lastChannelId = 0
}

let destroySocket = function (env, client) {
    //disconnect from channel
    if (client.channel) {
        let channel = env.channels[client.channel]
        for (const receiver of channel.clients) {
            if (receiver.userId !== client.userId) env.socketWrapper.send(receiver, client, {m: "disconnected"})
        }

        let i = channel.clients.indexOf(client)
        channel.clients.splice(i, 1)
    }
}

let receive = function (env, client, msg) {
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
        //todo make sure this channel is available
        client.channel = (env.lastChannelId++).toString()

        //private channel, first user is an admin
        tags.admin = true
    }

    //create new channel if not existing
    if (env.channels[client.channel] == null) {
        env.channels[client.channel] = {
            name: tags.admin && msg.header.name || client.channel,
            description: tags.admin && msg.header.description || "",
            password: null,
            visible: false,
            clients: [],
            tags: {},
            lastUserID: 0,
        }

        env.log("Channel created: ", client.channel)
    }

    let channel = env.channels[client.channel]

    //check password
    if (channel.password && channel.password !== msg.header.password) {
        client.channel = false
        env.sendError(client, msg, "wrong password")
        return
    }

    //assign a unique id since the ID would expose the IP
    //todo id overflow!
    client.userId = client.userId || channel.lastUserID++

    //add client to channel
    channel.clients.push(client)
    channel.tags[client.userId] = tags

    //apply initial settings
    if (msg.header.settings) {
        console.log("dhfjk")
        env.noobyModules.settings.receive(env, client, msg)
    }

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