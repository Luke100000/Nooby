/**
 *   _   _  ____   ____  ______     __
 *  | \ | |/ __ \ / __ \|  _ \ \   / /
 *  |  \| | |  | | |  | | |_) \ \_/ / 
 *  | . ` | |  | | |  | |  _ < \   /  
 *  | |\  | |__| | |__| | |_) | | |   
 *  |_| \_|\____/ \____/|____/  |_|   

 * Opensource multiplayer and network messaging for CoronaSDK, Moai, Gideros & LÖVE
 *
 * @usage
 * $ node nooby.js
 *
 * @authors
 * Luke100000
 * Thecoolpeople
 *
 * @license WTFPL
 *
 
**/

//definitions
mainPath = "/src/";
param = {
	MSG_START: 	"_MSG_START_",
	MSG_END: 	"_MSG_END_",
	JSON: 		"_JSON_",
	portTCP:	25000,
	portUDP:	25001,
	portWEB:	25002,
}
var cfg = {
	buffer_size: 1024 * 32, // buffer allocated per each socket client
	verbose: true, 			// set to true to capture lots of debug info
	verbose_adv: false,
}


stats =  require("./stats.js");  stats.load();
main = require("./noobyMain.js")

socketWrapper = require('./socketWrapper.js')
sockets = { } 			// this is where we store all current client socket connections
channelSettings = { } 	//this is where we store specific channel settings

var _log = function () {
	if (cfg.verbose) console.log.apply(console, arguments)
}

// black magic
/*process.on('uncaughtException', function (err) {
	_log('Exception: ' + err) // TODO: think we should terminate it on such exception
})*/

process.on('exit', function () {
	console.log('[exit] routine start');
	stats.save();
	//shutdown sockets   eventually sends messages to connected clients
	
	console.log('[exit] routine end');
});
process.on('SIGINT', function() { process.exit();});		//go to process.on("exit")
process.on('SIGTERM', function() { process.exit();});		//go to process.on("exit")


/////////////////////////////////////////////////////////////////////////
//				TEST ENVIRONMENT

console.log("TEST ENVIRONMENT");
var str = '_MSG_START_{"c":"msg", "length":10}_JSON_nachricht1_MSG_END__MSG_START_{"c":"msg", "length":10}_JSON_nachricht2_MSG_END_'
while(true) {	// this is for a case when several messages arrived in buffer
	if ((start = str.indexOf(param.MSG_START)) !== -1 && (end = str.indexOf(param.MSG_END)) !== -1) {
		//extract message and json
		var v = main.extract(str, start, end)
		str = v[0]; var json = v[1]; var msg = v[2];
		//console.log(v)
		//socket.buffer.len = socket.buffer.write(str, 0, 'binary')		//renew str in socket	(??why??)
		
		//run command
		main.auto[json.c](null, json, msg);
	}
	else{
		//no fully msg in in the buffer, break the while
		break;
	}
}