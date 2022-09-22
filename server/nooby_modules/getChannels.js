let receive = function (env, client, msg) {
    let channels = []
    for (let i in env.channels) {
        let channel = env.channels[i]
        if (channel.visible && (!msg.header.game || msg.header.game === channel.game)) {
            channels.push({
                channel: i,
                name: channel.name,
                description: channel.description,
                password: !!channel.password,
                clients: channel.clients.length,
            })
        }
    }

    env.socketWrapper.send(client, client, {m: "channels", channels: channels})
}

let aliases = []

module.exports = {
    receive,
    aliases,
}