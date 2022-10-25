let receive = function (env, client, msg) {
    env.socketWrapper.send(client, client, {m: "stats", stats: env.stats.getJson()})
}

let aliases = []

module.exports = {
    receive,
    aliases,
}