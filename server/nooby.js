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

//definitions
mainPath = "./server/";
stats =  require("./stats.js");
stats.load();

nm = {}
var nmpath = require("path").join(__dirname, "nooby_modules");
require("fs").readdirSync(nmpath).forEach(function(file) {
    if(file.indexOf(".js") != -1){
        file = file.replace(".js", "")
        console.log("[Module] load",file)
        nm[file] = require("./nooby_modules/" + file + ".js");
    }
});


cfg = {
    buffer_size: 1024 * 32, // buffer allocated per each socket client
    verbose: true,             // set to true to capture lots of debug info
    verbose_adv: false,        // advanced debug info in console

    portTCP:    25000,
    portUDP:    25001,
    portWEB:    25002,
    bufferSize: 1024 * 64,

    checkAlive: 10*1000,        // every 10 seconds
}



var callbacks = {
    channel: {},               // channels and specific channel settings

    receive: function(client, msg) {
        _log(msg)
        let data = 4
        if(msg.data) data += msg.data.length
        if(msg.json_data) data += msg.json_data.length
        if(msg.u) data += 3
        stats.add("dataIn",data)
        stats.add("msgIn", 1)

        if(msg.type == 4){return;}      //check alive messages are from the server; perhaps client want to check if server is online (why?) then there must be a return

        if(msg.json_data && msg.json.t){
            try{
                nm[msg.json.t](callbacks, client, msg)      //TODO
            }
            catch(err){
                console.log(err)
            }
        }

        socketWrapper.send(client, {lol:"hallo"}, "bimbo")
    },

    send: function(client, packet){
        stats.add("msgOut", 1)
        stats.add("dataOut", packet.length)
        socketWrapper.sendPacket(client, packet)
    },

    newClient: function(client) {
        stats.add("users", 1)
    },

    destroySocket: function(client, info) {
        
    },
}

//logger
_log = function () {
    if (cfg.verbose) console.log.apply(console, arguments)
}
_logAdv = function () {
    if (cfg.verbose_adv) console.log.apply(console, arguments)
}


let Wrapper = require('./socketWrapper.js').Wrapper
socketWrapper = new Wrapper(cfg, callbacks)


//Shutdown Events with automatical save
process.on('exit', function () {
    console.log('[exit] routine start');
    stats.save();
    socketWrapper.shutdown();        //shutdown sockets
    console.log('[exit] routine end');
});

//process.on('uncaughtException', function() { process.exit();});  //go to process.on("exit")
process.on('SIGINT', function() { process.exit();});             //go to process.on("exit")
process.on('SIGTERM', function() { process.exit();});            //go to process.on("exit")