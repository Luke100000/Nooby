const {Message} = require("../protocol/message.js")

function checkTags(clientTags, tags) {
    if (!tags) return true

    for (const key in tags) {
        if (tags[key] !== clientTags[key]) {
            return false
        }
    }
    return true
}

function receive(ctx, client, msg) {
    if (!client.channel) {
        ctx.router.sendError(client, msg, "no channel joined")
        return
    }

    const answer = new Message(null, msg)
    const channel = ctx.channels.get(client.channel)

    for (const receiver of channel.clients) {
        if (channel.hostOnly && client.userId !== channel.host && receiver.userId !== channel.host) {
            continue
        }
        if (receiver.userId !== client.userId && checkTags(channel.tags[receiver.userId], msg.header.t)) {
            ctx.router.sendMessage(receiver, client, answer)
        }
    }
}

module.exports = {
    receive,
    aliases: ["m"],
}
