let receive = function (env, client, msg) {
    let userId;

    if (msg.header.user) {
        if (env.clientChannelTags[client.user].admin) {
            userId = msg.header.user;
        } else {
            msg.header.reason = "permission denied"
            env.send(client, {c: "error", msg: msg.header})
            return
        }
    } else {
        userId = client.userId;
    }

    let tags = env.clientChannelTags[userId]
    if (msg.header.tag != null) {
        tags[msg.header.tag] = msg.header.value;

        if (!msg.header.user) {
            env.sendAdmins(env.channels[env.clientChannel[userId]], {c: "success", msg: msg.header})
        }
    }
}

let aliases = ["t"]

module.exports = {
    receive,
    aliases,
}