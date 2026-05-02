function receive(ctx, client, msg) {
    if (!client.channel) {
        ctx.router.sendError(client, msg, "no channel joined")
        return
    }

    const channel = ctx.channels.get(client.channel)
    const userId = msg.header.u != null ? msg.header.u : client.userId

    const tags = channel.tags[userId]
    if (!tags) {
        ctx.router.sendError(client, msg, "user not found")
        return
    }

    ctx.router.send(client, client, {
        m: "tags",
        u: userId,
        tags: Object.assign({}, tags),
    })
}

module.exports = {
    receive,
    aliases: [],
}
