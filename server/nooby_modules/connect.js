//generate unique ids
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
    client.session = client.ID + "_" + (msg.json.session || env.lastSessionID++).toString()

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
    if (msg.json.channel) {
        clientChannel = msg.json.channel.toString()
    } else {
        clientChannel = env.lastChannelId.toString()
        env.lastChannelId++

        //private channel, first user is an admin
        tags.admin = true
    }

    //create new channel if not existing
    if (env.channels[clientChannel] == null) {
        env.channels[clientChannel] = {
            name: msg.channel || msg.name || clientChannel, //public name, in case of public channel its id
            description: msg.channel == null && msg.description || "public",
            //password, public, slots, ...
            clients: [],
        }

        env._log("channel created:", clientChannel)
        env.stats.add("channels", 1)
    }

    let c = env.channels[clientChannel]

    //add client to channel
    c.clients.push(client)

    //notify admins
    for (const pair of c.clients) {
        let tagsClient = env.clientChannelTags[client.userId]
        if (tagsClient) {
            if (tagsClient.admin) {
                if(pair.userId !== client.userId)
                    env.send(pair, {c: "connected", user: client.userId})
            }
        }
    }
    env.send(client, {c: "connected", channel:clientChannel})

    //write
    env.clientChannel[client.userId] = clientChannel
    env.clientChannelTags[client.userId] = tags
}

let aliases = ["c"]

module.exports = {
    init,
    receive,
    aliases,
}