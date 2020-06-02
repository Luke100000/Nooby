let init = function(env) {
    env.channels = {}
    env.clientChannel = {}
    env.clientChannelTags = {}
    env.lastChannelId = 0
}

let receive = function(env, client, msg) {
    let clientChannel = env.clientChannel[client.userId]
    let tags = env.clientChannelTags[client.userId]

    //disconnect from old channel
    if (clientChannel){
        let channel = env.channels[clientChannel]
        let i = channel.clients.indexOf(client)
        channel.clients.splice(i)
    }

    //reset client data
    tags = {}

    //set new channel name, or random if no name specified
    if (msg.channel && msg.channel.length()>0) {
        clientChannel = msg.channel.toString()
    } else {
        clientChannel = env.lastChannelId.toString()
        env.lastChannelId++

        //private channel, first user is an admin
        tags.admin = true
    }

    //create new channel if not existing
    if (env.channels[clientChannel] == null) {
        let c = {
            name: msg.channel || msg.name || clientChannel, //public name, in case of public channel its id
            description: msg.channel == null && msg.description || "public",
            //password, public, slots, ...
            clients: [],
        }
        env.channels[clientChannel] = c
        _log("channel created:",clientChannel)
        stats.add("channels", 1)
    }

    let c = env.channels[clientChannel]

    //add client to channel
    c.clients.push(client)

    //notify admins
    for (const pair of c.clients) {
        let tagsClient = env.clientChannelTags[pair.userId]
        if(tagsClient){
            if (tagsClient.admin) {
                env.send(pair, {c:"connected", user:client.userId})
            }
        }
    }
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