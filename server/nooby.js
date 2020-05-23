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
mainPath = "./server/";//"/src/";

cfg = {
	buffer_size: 1024 * 32, // buffer allocated per each socket client
	verbose: true, 			// set to true to capture lots of debug info
	verbose_adv: false,

	portTCP:	25000,
	portUDP:	25001,
	portWEB:	25002,
	bufferSize: 1024 * 64,
}

var callbacks = {
	receive: function(client, msg) {
		_log(msg)
		socketWrapper.send(client, {lol:"hallo"}, "bimbo")
	},

	newClient: function(client) {
		
	},

	destroySocket: function(client, info) {
		
	},
}

//logger
_log = function () {
	if (cfg.verbose) console.log.apply(console, arguments)
}


stats =  require("./stats.js");
stats.load();

let Wrapper = require('./socketWrapper.js').Wrapper
socketWrapper = new Wrapper(cfg, callbacks)

//channels and specific channel settings
channel = {}



//Shutdown Events with automatical save
process.on('exit', function () {
	console.log('[exit] routine start');
	stats.save();
	socketWrapper.shutdown();		//shutdown sockets
	console.log('[exit] routine end');
});

//process.on('uncaughtException', function() { process.exit();});  //go to process.on("exit")
process.on('SIGINT', function() { process.exit();});             //go to process.on("exit")
process.on('SIGTERM', function() { process.exit();});            //go to process.on("exit")