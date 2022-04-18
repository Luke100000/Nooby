let checkTags = function (clientTags, tags) {
    if (clientTags == null) {
        return false
    } else if (tags) {
        for (const key in tags) {
            if (tags[key] !== clientTags[key]) {
                return false
            }
        }
        return true
    } else {
        return true
    }
}

let receive = function (env, client, msg) {
    let clientChannel = env.clientChannel[client.userId]

    //check if client is in a channel
    if (clientChannel != null) {
        //create return msg
        let header = {
            u: client.userId,
            data: msg.header.data
        }

        let msgReturn = new env.Msg(header, msg.data);
        let packet = env.msgToPacket(msgReturn)

        //send packet to everyone in the channel, excluding the sender
        for (const target of env.channels[clientChannel].clients) {
            if (target.userId !== client.userId && checkTags(env.clientChannelTags[target.userId], msg.header.tags)) {
                env.sendPacket(target, packet)
            }
        }
    } else {
        //simple ping
        env.send(client, {c: "m"}, msg.data)
    }
}

let aliases = ["m"]

module.exports = {
    receive,
    aliases,
}