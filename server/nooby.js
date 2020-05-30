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

mainPath = "./server/";
stats = require("./stats.js");
stats.load();

//config
cfg = {
    buffer_size: 1024 * 32,    // buffer allocated per each socket client
    verbose: true,             // set to true to capture lots of debug info
    verbose_adv: false,        // advanced debug info in console

    portTCP: 25000,
    portUDP: 25001,
    portWEB: 25002,
    bufferSize: 1024 * 64,

    checkAlive: 10 * 1000,        // every 10 seconds
}

//logger
_log = function () {
    if (cfg.verbose) console.log.apply(console, arguments)
}
_logAdv = function () {
    if (cfg.verbose_adv) console.log.apply(console, arguments)
}

//module data and methods environment
let environment = {
    _log: _log,

    sendPacket: function(client, packet) {
        length = socketWrapper.sendPacket(client, packet)

        stats.add("msgOut", 1)
        stats.add("dataOut", length)
    },

    send: function (client, json, data) {
        length = socketWrapper.send(client, json, data)

        stats.add("msgOut", 1)
        stats.add("dataOut", length)
    },
}

//modules
nm = {}
let nmpath = require("path").join(__dirname, "nooby_modules");
require("fs").readdirSync(nmpath).forEach(function (file) {
    if (file.indexOf(".js") !== -1) {
        file = file.replace(".js", "")
        console.log("[Module] load " + file)
        nm[file] = require("./nooby_modules/" + file + ".js");

        //register aliases
        nm[file].aliases = nm[file].aliases || []
        for (let i = 0; i < nm[file].aliases.length; i++) {
            nm[nm[file].aliases[i]] = nm[file]
        }

        //init
        if (nm[file].init) {
            nm[file].init(environment)
        }
    }
});

//wrapper callbacks
let callbacks = {
    receive: function (client, msg) {
        _log(msg)
        let data = 4 + msg.length || 0 + msg.size || 0
        stats.add("dataIn", data)
        stats.add("msgIn", 1)

        if (nm[msg.json.cmd]) {
            if (nm[msg.json.cmd].receive) {
                nm[msg.json.cmd].receive(environment, client, msg)
            }
        } else {
            _log("Unknown message type " + msg.json.cmd)
        }
    },

    newClient: function (client) {
        stats.add("users", 1)
    },

    destroySocket: function (client, info) {

    },

    _log: _log,
};


let Wrapper = require('./socketWrapper.js').Wrapper
socketWrapper = new Wrapper(cfg, callbacks)


//Shutdown Events with automatic save
process.on('exit', function () {
    console.log('[exit] routine start');
    stats.save();
    socketWrapper.shutdown(); //shutdown sockets
    console.log('[exit] routine end');
});

//process.on('uncaughtException', function() { process.exit();});  //go to process.on("exit")
process.on('SIGINT', function () {
    process.exit();
});             //go to process.on("exit")
process.on('SIGTERM', function () {
    process.exit();
});