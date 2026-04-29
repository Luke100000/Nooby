function receive(ctx, client, msg) {
    ctx.router.send(client, client, {
        m: "channels",
        channels: ctx.channels.visible(msg.header.game),
    })
}

module.exports = {
    receive,
    aliases: [],
}
