let receive = function(env, client, msg) {
    //check if client is in channel
    if(client.channel){
        let packet
        //send packet to everyone in the channel ?außer dem sender?
    }
    //simple ping
    env.send(client, {c:"m"}, msg.data)
}

let aliases = ["m"]

module.exports = {
    receive,
    aliases,
}