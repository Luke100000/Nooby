/**
 *   _   _  ____   ____  ______     __
 *  | \ | |/ __ \ / __ \|  _ \ \   / /
 *  |  \| | |  | | |  | | |_) \ \_/ /
 *  | . ` | |  | | |  | |  _ < \   /
 *  | |\  | |__| | |__| | |_) | | |
 *  |_| \_|\____/ \____/|____/  |_|

 * Opensource multiplayer and network messaging for Lua
 *
 * @usage
 * $ node nooby.js
 *
 * @authors
 * Luke100000
 * Thecoolpeople
 *
 * @license MIT
 *
 **/

const {createApp} = require("./core/app.js")

const app = createApp({
    rootDirectory: __dirname,
})

app.start()

// Shutdown Events with automatic save
process.on('exit', function () {
    console.log('[exit] routine start');
    app.shutdown();
    console.log('[exit] routine end');
});

process.on('SIGINT', function () {
    process.exit();
});

process.on('SIGTERM', function () {
    process.exit();
});
