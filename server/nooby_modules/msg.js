let checkTags = function (clientTags, header) {
    if (clientTags == null) {
        return false
    } else {
        if (header.tag != null) {
            return clientTags[header.tag] === header.tagValue
        } else if (header.tags != null) {
            for (const key in header.tags) {
                if (header.tags[key] !== clientTags[key]) {
                    return false
                }
            }
            return true
        } else {
            return true
        }
    }
}

let receive = function (env, client, msg) {
    let clientChannel = env.clientChannel[client.userId]

    //check if client is in a channel
    if (clientChannel != null) {
        //create return msg
        let header = {
            cmd: "msg",
            user: client.userId,
            data: msg.header.data
        }

        let msgReturn = new env.Msg(header, msg.data);
        let packet = env.msgToPacket(msgReturn)

        //send packet to everyone in the channel, excluding the sender
        for (const clientC of env.channels[clientChannel].clients) {
            //if (clientC.userId !== client.userId)
            if (checkTags(env.clientChannelTags[clientC.userId], msg.header))
                env.sendPacket(clientC, packet)
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