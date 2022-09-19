let receive = function (env, client, msg) {
    if (!client.channel) return
    let channel = env.channels[client.channel]

    let userId;
    if (msg.header.u) {
        if (channel.tags[client.userId].admin) {
            userId = msg.header.u;
        } else {
            env.sendError(client, msg, "permission denied")
            return
        }
    } else {
        userId = client.userId;
    }

    let tags = channel.tags[userId]
    if (msg.header.tag != null) {
        tags[msg.header.tag] = msg.header.value;
    }
}

let aliases = ["t"]

module.exports = {
    receive,
    aliases,
}