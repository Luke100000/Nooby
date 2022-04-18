let receive = function (env, client, msg) {
    let send = false;

    //check if receiver exists
    if (msg.header.user != null) {
        //create return msg
        let header = {
            c: "dm",
            u: client.userId,
            data: msg.header.data
        }

        let msgReturn = new env.Msg(header, msg.data);
        let packet = env.msgToPacket(msgReturn)

        for (const target of env.socketWrapper.clients) {
            if (target.userId === msg.header.user) {
                env.sendPacket(target, packet)
                send = true;
            }
        }
    }

    if (!send) {
        env.send(client, {
            c: "error",
            reason: "user not found",
            header: msg.header
        })
    }
}

let aliases = ["dm"]

module.exports = {
    receive,
    aliases,
}