let receive = function (env, client, msg) {
    let sent = false;

    for (const receiver of env.socketWrapper.clients) {
        if (receiver.userId === msg.header.u) {
            let answer = new env.Message(null, msg);
            env.socketWrapper.sendMessage(receiver, client, answer)
            sent = true;
            break;
        }
    }

    if (!sent) {
        env.sendError(client, msg, "user not found")
    }
}

let aliases = ["dm"]

module.exports = {
    receive,
    aliases,
}