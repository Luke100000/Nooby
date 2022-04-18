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
    verbose: false,             // set to true to capture lots of debug info
    verbose_adv: false,         // advanced debug info in console

    portTCP: 25000,
    portUDP: 25001,
    portWEB: 25002,
    bufferSize: 1024 * 128,     // buffer allocated per each socket client

    checkAlive: 10 * 1000,      // check if every client is alive every 10 seconds
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
    Msg: require('./socketWrapper.js').Msg,

    msgToPacket: new (require('./socketWrapper.js')).Wrapper(null, null).msgToPacket,
    stats: stats,

    sendPacket: function (client, packet) {
        length = socketWrapper.sendPacket(client, packet)

        stats.add("msgOut", 1)
        stats.add("dataOut", length)
    },

    send: function (client, header, data) {
        length = socketWrapper.send(client, header, data)

        stats.add("msgOut", 1)
        stats.add("dataOut", length)
    },

    sendAdmins: function (channel, header, data) {
        for (const client of channel.clients) {
            let tagsClient = environment.clientChannelTags[client.userId]
            if (tagsClient && tagsClient.admin) {
                environment.send(client, header, data)
            }
        }
    }
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
        let data = 4 + (msg.length || 0) + (msg.size || 0)
        stats.add("msgIn", 1)
        stats.add("dataIn", data)

        if (nm[msg.header.c]) {
            if (nm[msg.header.c].receive) {
                nm[msg.header.c].receive(environment, client, msg)
            }
        } else {
            _log("Unknown message type " + msg.header.c)
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
environment.socketWrapper = socketWrapper


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