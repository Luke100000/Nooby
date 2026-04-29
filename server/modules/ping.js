const {Message} = require("../protocol/message.js")

function receive(ctx, client, msg) {
    const answer = new Message(null, msg)
    ctx.router.sendMessage(client, client, answer)
}

module.exports = {
    receive,
    aliases: ["p"],
}
