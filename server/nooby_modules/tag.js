let receive = function (env, client, msg) {
    //reset client data
    let tags = env.clientChannelTags[client.userId]

    if (msg.json.tag != null) {
        tags[msg.json.tag] = msg.json.tagValue;
    }
}

let aliases = ["t"]

module.exports = {
    receive,
    aliases,
}