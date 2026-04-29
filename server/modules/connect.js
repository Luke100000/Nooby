function destroyClient(ctx, client) {
    if (!client.channel) return

    const channel = ctx.channels.get(client.channel)
    if (!channel) return

    for (const receiver of channel.clients) {
        if (receiver.userId !== client.userId) {
            ctx.router.send(receiver, client, {m: "disconnected"})
        }
    }

    const index = channel.clients.indexOf(client)
    if (index >= 0) {
        channel.clients.splice(index, 1)
    }
    delete channel.tags[client.userId]
    ctx.channels.removeIfEmpty(client.channel)
}

function receive(ctx, client, msg) {
    if (msg.header.channel != null && typeof msg.header.channel !== "string") {
        ctx.router.sendError(client, msg, "invalid channel")
        return
    }

    const nextChannel = msg.header.channel || null

    if (client.channel) {
        const previousChannel = ctx.channels.get(client.channel)
        if (previousChannel) {
            const index = previousChannel.clients.indexOf(client)
            if (index >= 0) {
                previousChannel.clients.splice(index, 1)
            }
            delete previousChannel.tags[client.userId]
            if (previousChannel.clients.length === 0 && client.channel !== nextChannel) {
                ctx.channels.removeIfEmpty(client.channel)
            }
        }
    }

    const tags = {}
    if (nextChannel) {
        client.channel = nextChannel
    } else {
        client.channel = ctx.channels.createPrivateName()
        tags.admin = true
    }

    const channel = ctx.channels.ensure(client.channel)
    if (channel.password && channel.password !== msg.header.password) {
        client.channel = false
        ctx.router.sendError(client, msg, "wrong password")
        return
    }

    client.userId = channel.lastUserId++
    channel.clients.push(client)
    channel.tags[client.userId] = tags

    if (msg.header.settings) {
        ctx.modules.settings.receive(ctx, client, msg)
    }

    for (const receiver of channel.clients) {
        if (receiver.userId !== client.userId) {
            ctx.router.send(receiver, client, {m: "connected"})
        }
    }
    ctx.router.send(client, client, {m: "connected", channel: client.channel})
}

module.exports = {
    destroyClient,
    receive,
    aliases: ["c"],
}
