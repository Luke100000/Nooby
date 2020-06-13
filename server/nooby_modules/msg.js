let checkTags = function (clientTags, json) {
    if (clientTags == null) {
        return false
    } else {
        if (json.tag != null) {
            return clientTags[json.tag] === json.tagValue
        } else if (json.tags != null) {
            for (const key in json.tags) {
                if (json.tags[key] !== clientTags[key]) {
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
        let json = {
            cmd: "msg",
            user: client.userId,
            data: msg.json.data
        }

        let msgReturn = new env.Msg(json, msg.data);
        let packet = env.msgToPacket(msgReturn)

        //send packet to everyone in the channel, excluding the sender
        for (const clientC of env.channels[clientChannel].clients) {
            //if (clientC.userId !== client.userId)
            if (checkTags(env.clientChannelTags[clientC.userId], msg.json))
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