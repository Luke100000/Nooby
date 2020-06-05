let receive = function (env, client, msg) {
    let clientChannel = env.clientChannel[client.userId]

    //check if client is in channel
    if (clientChannel != null) {
        //create return msg
        let json = {
            cmd: "msg",
            user: client.userId,
        }

        let msgReturn = new env.Msg(json, msg.data);
        let packet = env.msgToPacket(msgReturn)
        //send packet to everyone in the channel, exclude the sender
        for (const clientC of env.channels[clientChannel].clients) {
            if(clientC.userId != client.userId)
                env.sendPacket(clientC, packet)
        }
    } else {
        //simple ping
        env.send(client, {c: "m"}, msg.data)
    }
}

let aliases = ["m"]

module.exports = {
    receive,
    aliases,
}