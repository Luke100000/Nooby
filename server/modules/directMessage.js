const {Message} = require("../protocol/message.js")

function receive(ctx, client, msg) {
    if (!client.channel) {
        ctx.router.sendError(client, msg, "no channel joined")
        return
    }

    const channel = ctx.channels.get(client.channel)

    if (channel.hostOnly && client.userId !== channel.host && msg.header.u !== channel.host) {
        ctx.router.sendError(client, msg, "permission denied")
        return
    }

    let sent = false

    for (const receiver of channel.clients) {
        if (receiver.userId === msg.header.u) {
            const answer = new Message(null, msg)
            ctx.router.sendMessage(receiver, client, answer)
            sent = true
            break
        }
    }

    if (!sent) {
        ctx.router.sendError(client, msg, "user not found")
    }
}

module.exports = {
    receive,
    aliases: ["dm"],
}
