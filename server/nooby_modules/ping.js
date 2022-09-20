let receive = function (env, client, msg) {
    let answer = new env.Message(null, msg);
    env.socketWrapper.sendMessage(client, client, answer)
}

let aliases = ["p"]

module.exports = {
    receive,
    aliases,
}