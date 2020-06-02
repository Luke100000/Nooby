let receive = function(env, client, msg) {
    let clientChannel = env.clientChannel[client.userId]
    //check if client is in channel
    if(clientChannel != null){
        msg.json.user=client.userId
        let msgReturn = new env.Msg(msg.json, msg.data);
        let packet = socketWrapper.msgToPacket(msgReturn)
        //send packet to everyone in the channel
        for (const client of env.channels[clientChannel].clients){
            env.sendPacket(client, packet)
        }
    }
    else{
        //simple ping
        env.send(client, {c:"m"}, msg.data)
    }
}

let aliases = ["m"]

module.exports = {
    receive,
    aliases,
}