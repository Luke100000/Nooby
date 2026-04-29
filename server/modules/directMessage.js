const {Message} = require("../protocol/message.js")

function receive(ctx, client, msg) {
    let sent = false

    for (const receiver of ctx.clients.all()) {
        if (receiver.channel === client.channel && receiver.userId === msg.header.u) {
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
