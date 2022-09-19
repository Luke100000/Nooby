let checkTags = function (clientTags, tags) {
    if (tags) {
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
    //check if client is in a channel
    if (client.channel != null) {
        //answer
        let answer = new env.Message(null, msg)

        //send packet to everyone in the channel, excluding the sender
        let channel = env.channels[client.channel]
        for (const receiver of channel.clients) {
            if (receiver.userId !== client.userId && checkTags(channel.tags[receiver.userId], msg.header.t)) {
                env.socketWrapper.sendMessage(receiver, client, answer)
            }
        }
    } else {
        env.sendError(client, msg, "no channel joined")
    }
}

let aliases = ["m"]

module.exports = {
    receive,
    aliases,
}