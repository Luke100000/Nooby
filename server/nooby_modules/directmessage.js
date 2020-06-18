let receive = function (env, client, msg) {
    let send = false;
    //check if receiver exists
    if (msg.json.toUser != null) {
        //create return msg
        let header = {
            cmd: "dm",
            user: client.userId,
            data: msg.header.data
        }

        let msgReturn = new env.Msg(header, msg.data);
        let packet = env.msgToPacket(msgReturn)

        for (const clientC of env.channels[clientChannel].clients) {
            if(clientC.userId == msg.json.toUser){
                env.sendPacket(clientC, packet)
                send = true;
            }
        }
    }
    if(!send){
        env.send(client, {c: "dm"}, {error:"user not found"})
    }
}

let aliases = ["dm"]

module.exports = {
    receive,
    aliases,
}