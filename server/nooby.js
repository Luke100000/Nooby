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


// check if node_modules are installed, and if not, install them
function checkAndInstall(moduleName, moduleVersion){
    const { execSync } = require('child_process');
    try{
        execSync(`npm ls ${moduleName}`);
        console.log(`Module installed: ${moduleName}@${moduleVersion}...`);
    }catch (error){
        console.log(`Installing ${moduleName}@${moduleVersion}...`);
        try{
            execSync(`npm install ${moduleName}@${moduleVersion}`);
            console.log(`${moduleName}@${moduleVersion} has been installed.`);
        }catch(error){
            console.error(`Failed to install ${moduleName}@${moduleVersion}: ${error.message}`);
        }
    }
}
checkAndInstall('msgpack-js', '0.3.0')
checkAndInstall('websocket',  '1.0.31')


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

if (!fs.existsSync("./crashlogs/")) {
    fs.mkdirSync("./crashlogs/");
}

//wrapper callbacks
let callbacks = {
    log: log,

    receive: function (client, message) {
        stats.add("incomingMessages", 1)
        stats.add("incomingBytes", 6 + message.headerSize + message.payloadSize)

        verbose("received", client.ID, message)

        if (noobyModulesAliases[message.header.m]) {
            if (noobyModulesAliases[message.header.m].receive) {
                try {
                    noobyModulesAliases[message.header.m].receive(environment, client, message)
                } catch (error) {
                    console.log(error)
                    let err = error.message
                    if ("stack" in error) {
                        err += "\n" + error.stack
                    }
                    fs.writeFileSync("./crashlogs/" + Date.now().toString() + ".txt", err);
                }
            }
        } else {
            log("Unknown message type '" + message.header.m + "'")
        }
    },

    send: function (receiver, sender, message) {
        stats.add("outgoingMessages", 1)
        stats.add("outgoingBytes", message.headerSize + message.payloadSize)

        verbose("sent", receiver.ID + " to " + sender.ID, message)
    },

    newClient: function (client) {
        stats.add("newConnections", 1)
    },

    destroySocket: function (client, info) {
        for (let m in noobyModules) {
            if (noobyModules[m].destroySocket) {
                noobyModules[m].destroySocket(environment, client)
            }
        }
    },
};

noobyModules = {}
noobyModulesAliases = {}

//module data and helper functions
let environment = {
    log: log,
    stats: stats,
    Message: require('./socketWrapper.js').Message,
    socketWrapper: new (require('./socketWrapper.js').Wrapper)(config, callbacks),
    noobyModules: noobyModules,

    sendError: function (client, msg, reason) {
        this.socketWrapper.send(client, client, {
            "m": "error",
            "header": msg.header,
            "reason": reason
        })
    }
}

//modules
require("fs").readdirSync("./nooby_modules").forEach(function (file) {
    if (file.indexOf(".js") !== -1) {
        file = file.replace(".js", "")
        console.log("[Module] load " + file)

        let m = require("./nooby_modules/" + file + ".js");
        noobyModules[file] = m
        noobyModulesAliases[file] = m

        //register aliases
        noobyModules[file].aliases = noobyModules[file].aliases || []
        for (let i = 0; i < noobyModules[file].aliases.length; i++) {
            noobyModulesAliases[noobyModules[file].aliases[i]] = noobyModules[file]
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