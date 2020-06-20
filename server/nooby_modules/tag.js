let receive = function (env, client, msg) {
    let userId;

    if (msg.header.userId) {
        if (env.clientChannelTags[client.userId].admin) {
            userId = msg.header.userId;
        } else {
            env.send(client, {c: "permission_denied", msg: msg.header})
            return
        }
    } else {
        userId = client.userId;
    }

    let tags = env.clientChannelTags[userId]
    if (msg.header.tag != null) {
        tags[msg.header.tag] = msg.header.tagValue;
        env.sendAdmins(env.channels[env.clientChannel[userId]], {c: "success", msg: msg.header})
    }
}

let aliases = ["t"]

module.exports = {
    receive,
    aliases,
}