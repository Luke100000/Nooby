let receive = function(env, client, msg) {
    //simple ping
    env.send(client, {c:"m"}, msg.data)
}

let aliases = ["m"]

module.exports = {
    receive,
    aliases,
}