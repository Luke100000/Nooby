function receive(ctx, client, msg) {
    if (!client.channel) {
        ctx.router.sendError(client, msg, "no channel joined")
        return
    }

    const channel = ctx.channels.get(client.channel)
    let userId

    if (msg.header.u != null) {
        if (!channel.tags[client.userId].admin) {
            ctx.router.sendError(client, msg, "permission denied")
            return
        }
        userId = msg.header.u
    } else {
        userId = client.userId
    }

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
