let init = function(env) {
    env.channels = {}
    env.lastChannelId = 0
}

let receive = function(env, client, msg) {
    //disconnect from old channel
    if (client.channel) {
        let channel = env.channels[client.channel]
        let i = channel.clients.indexOf(client)
        channel.clients.splice(i)
    }

    //reset client data
    client.tags = {}

    //set new channel name, or random if no name specified
    if (msg.channel) {
        client.channel = msg.channel.toString()
    } else {
        client.channel = env.lastChannelId.toString()
        env.lastChannelId++

        //private channel, first user is an admin
        client.tags.admin = true
    }

    //create new channel if not existing
    if (env.channels[client.channel] == null) {
        let c = {
            name: msg.channel || msg.name || client.channel, //public name, in case of public channel its id
            description: msg.channel == null && msg.description || "public",
            //password, public, slots, ...
            clients: [],
        }
        env.channels[client.channel] = c
    }

    let c = env.channels[client.channel]

    //add client to channel
    c.clients.push(client)

    //notify admins
    for (const pair of c.clients) {
        if (pair.value.tags.admin) {
            env.send(pair.value, {c:"connected", user:client.userId})
        }
    }
}

module.exports = {
    init,
    receive,
}