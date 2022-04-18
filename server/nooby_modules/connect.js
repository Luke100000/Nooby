let init = function (env) {
    env.channels = {}

    env.clientChannel = {}
    env.clientChannelTags = {}
    env.lastChannelId = 0

    env.lastSessionID = 0;
    env.lastID = 0;
    env.userIds = {}
}

let receive = function (env, client, msg) {
    //client identifier
    client.session = client.ID + "_" + (msg.header.session || env.lastSessionID++).toString()

    //assign user ID or create new
    client.userId = env.userIds[client.session] || env.lastID++
    env.userIds[client.session] = client.userId

    let clientChannel = env.clientChannel[client.userId]

    //disconnect from old channel
    if (clientChannel) {
        let channel = env.channels[clientChannel]
        let i = channel.clients.indexOf(client)
        channel.clients.splice(i)
    }

    //reset client data
    let tags = {}
    env.clientChannelTags[client.userId] = tags

    //set new channel name, or random if no name specified
    if (msg.header.channel) {
        clientChannel = msg.header.channel.toString()
    } else {
        clientChannel = env.lastChannelId.toString()
        env.lastChannelId++

        //private channel, first user is an admin
        tags.admin = true
    }

    //create new channel if not existing
    if (env.channels[clientChannel] == null) {
        env.channels[clientChannel] = {
            //todo unused
            name: msg.name || clientChannel,
            description: msg.channel == null && msg.description || "public",
            clients: [],
        }

        env._log("channel created:", clientChannel)
        env.stats.add("channels", 1)
    }

    let c = env.channels[clientChannel]

    //add client to channel
    c.clients.push(client)
    env.clientChannel[client.userId] = clientChannel

    //notify other user
    for (const clientC of c.clients) {
        if (clientC.userId !== client.userId)
            env.send(clientC, {c: "connected", u: client.userId})
    }
    env.send(client, {c: "connected", channel: clientChannel})
}

let aliases = ["c"]

module.exports = {
    init,
    receive,
    aliases,
}