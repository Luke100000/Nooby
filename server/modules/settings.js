function receive(ctx, client, msg) {
    if (!msg.header.settings) {
        ctx.router.sendError(client, msg, "missing settings")
        return
    }

    if (client.channel == null) {
        ctx.router.sendError(client, msg, "no channel joined")
        return
    }

    const channel = ctx.channels.get(client.channel)
    if (!channel.tags[client.userId].admin) {
        ctx.router.sendError(client, msg, "no permissions")
        return
    }

    for (const [key, value] of Object.entries(msg.header.settings)) {
        if (key === "password") {
            channel.password = value
        } else if (key === "visible") {
            channel.visible = !!value
        } else if (key === "game") {
            channel.game = value
        } else if (key === "description") {
            channel.description = value
        } else if (key === "name") {
            channel.name = value
        } else {
            ctx.router.sendError(client, msg, "unknown key " + key.toString())
        }
    }
}

module.exports = {
    receive,
    aliases: [],
}
