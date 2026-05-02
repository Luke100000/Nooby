function receive(ctx, client, msg) {
    if (!client.channel) return

    const channel = ctx.channels.get(client.channel)
    let userId

    if (msg.header.u != null) {
        if (channel.host === client.userId) {
            userId = msg.header.u
        } else {
            ctx.router.sendError(client, msg, "permission denied")
            return
        }
    } else {
        userId = client.userId
    }

    const tags = channel.tags[userId]
    if (!tags) {
        ctx.router.sendError(client, msg, "user not found")
        return
    }
    if (msg.header.tag != null) {
        if (msg.header.value == null) {
            delete tags[msg.header.tag]
        } else {
            tags[msg.header.tag] = msg.header.value
        }
    }
}

module.exports = {
    receive,
    aliases: ["t"],
}
