function receive(ctx, client, msg) {
    ctx.router.send(client, client, {m: "stats", stats: ctx.stats.get()})
}

module.exports = {
    receive,
    aliases: [],
}
