let receive = function (env, client, msg) {
    //check if client is in a channel
    if (client.channel != null) {
        //send packet to everyone in the channel, excluding the sender
        let channel = env.channels[client.channel]
        if (channel.tags[client.userId].admin) {
            for (const [key, value] of Object.entries(msg.header.settings)) {
                if (key === "password") {
                    channel.password = value
                } else if (key === "visible") {
                    channel.visible = !!value
                } else if (key === "game") {
                    channel.game = value
                } else if (key === "description") {
                    channel.description = value
                } else if (key === "name") {
                    channel.name = value
                } else {
                    env.sendError(client, msg, "unknown key " + key.toString())
                }
            }
        } else {
            env.sendError(client, msg, "no permissions")
        }
    } else {
        env.sendError(client, msg, "no channel joined")
    }
}

let aliases = []

module.exports = {
    receive,
    aliases,
}