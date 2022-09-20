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

const fs = require('fs');

stats = require("./stats.js");
stats.load();

//config
// noinspection JSCheckFunctionSignatures
config = JSON.parse(fs.readFileSync('./config.json'));

//logger
log = function () {
    if (config.logging) console.log.apply(console, arguments)
}
verbose = function () {
    if (config.verbose) console.info.apply(console, arguments)
}


//wrapper callbacks
let callbacks = {
    log: log,

    receive: function (client, message) {
        stats.add("msgIn", 1)
        stats.add("dataIn", 6 + message.headerSize + message.payloadSize)

        verbose("received", client.ID, message)

        if (noobyModules[message.header.m]) {
            if (noobyModules[message.header.m].receive) {
                noobyModules[message.header.m].receive(environment, client, message)
            }
        } else {
            log("Unknown message type '" + message.header.m + "'")
        }
    },

    send: function (receiver, sender, message) {
        stats.add("msgOut", 1)
        stats.add("dataOut", message.headerSize + message.payloadSize)

        verbose("sent", receiver.ID + " to " + sender.ID, message)
    },

    newClient: function (client) {
        stats.add("users", 1)
    },

    destroySocket: function (client, info) {
        for (let m in noobyModules) {
            if (noobyModules[m].destroySocket) {
                noobyModules[m].destroySocket(environment, client)
            }
        }
    },
};

//module data and helper functions
let environment = {
    log: log,
    Message: require('./socketWrapper.js').Message,
    socketWrapper: new (require('./socketWrapper.js').Wrapper)(config, callbacks),

    sendError: function (client, header, reason) {
        this.socketWrapper.send(client, client, {
            "header": header,
            "reason": reason
        })
    }
}

//modules
noobyModules = {}
require("fs").readdirSync("./nooby_modules").forEach(function (file) {
    if (file.indexOf(".js") !== -1) {
        file = file.replace(".js", "")
        console.log("[Module] load " + file)
        noobyModules[file] = require("./nooby_modules/" + file + ".js");

        //register aliases
        noobyModules[file].aliases = noobyModules[file].aliases || []
        for (let i = 0; i < noobyModules[file].aliases.length; i++) {
            noobyModules[noobyModules[file].aliases[i]] = noobyModules[file]
        }

        //init
        if (noobyModules[file].init) {
            noobyModules[file].init(environment)
        }
    }
});

// Shutdown Events with automatic save
process.on('exit', function () {
    console.log('[exit] routine start');
    stats.save();
    environment.socketWrapper.shutdown();
    console.log('[exit] routine end');
});

process.on('SIGINT', function () {
    process.exit();
});

process.on('SIGTERM', function () {
    process.exit();
});