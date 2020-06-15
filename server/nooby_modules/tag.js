let receive = function (env, client, msg) {
    //reset client data
    let tags = env.clientChannelTags[client.userId]

    if (msg.header.tag != null) {
        tags[msg.header.tag] = msg.header.tagValue;
    }
}

let aliases = ["t"]

module.exports = {
    receive,
    aliases,
}