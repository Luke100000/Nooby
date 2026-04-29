function destroyClient(ctx, client) {
    if (!client.channel) return

    const channelName = client.channel
    const channel = ctx.channels.get(channelName)
    if (!channel) return

    for (const receiver of channel.clients) {
        if (receiver.userId !== client.userId) {
            ctx.router.send(receiver, client, {m: "disconnected"})
        }
    }

    ctx.channels.removeClient(channelName, client)
    ctx.channels.removeIfEmpty(channelName)
}

function receive(ctx, client, msg) {
    if (msg.header.channel != null && typeof msg.header.channel !== "string") {
        ctx.router.sendError(client, msg, "invalid channel")
        return
    }

    const nextChannel = msg.header.channel || null

    if (client.channel) {
        const previousChannelName = client.channel
        const previousChannel = ctx.channels.get(client.channel)
        if (previousChannel) {
            for (const receiver of previousChannel.clients) {
                if (receiver.userId !== client.userId) {
                    ctx.router.send(receiver, client, {m: "disconnected"})
                }
            }

            ctx.channels.removeClient(previousChannelName, client)
            if (previousChannel.clients.length === 0 && previousChannelName !== nextChannel) {
                ctx.channels.removeIfEmpty(previousChannelName)
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

    const userId = ctx.channels.assignUserId(channel)
    if (userId == null) {
        client.channel = false
        ctx.router.sendError(client, msg, "channel full")
        return
    }

    client.userId = userId
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
