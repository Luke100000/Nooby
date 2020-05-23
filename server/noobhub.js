/**
 * NoobHub node.js server (modded)
 * Opensource multiplayer and network messaging for CoronaSDK, Moai, Gideros & LÖVE
 *
 * @usage
 * $ nodejs node.js
 *
 * @authors
 * Igor Korsakov
 * Sergii Tsegelnyk
 * modded by Luke100000
 *
 * @license WTFPL
 *
 * https://github.com/Overtorment/NoobHub
 *
 **/

var statsNEW =  require("./stats.js")
var server = require('net').createServer()
var sockets = { } // this is where we store all current client socket connections
var channelSettings = { } //this is where we store specific channel settings
var cfg = {
	port: 25565,
	buffer_size: 1024 * 32, // buffer allocated per each socket client
	verbose: true, // set to true to capture lots of debug info
	verbose_adv: false,
}
var _log = function () {
	if (cfg.verbose) console.log.apply(console, arguments)
}

// black magic
process.on('uncaughtException', function (err) {
	_log('Exception: ' + err) // TODO: think we should terminate it on such exception
})

server.on('connection', function (socket) {
	socket.setNoDelay(true)
	socket.setKeepAlive(true, 300 * 1000)
	socket.isConnected = true
	socket.connectionId = socket.remoteAddress + '-' + socket.remotePort // unique, used to trim out from sockets hashmap when closing socket
	var arr = new Uint8Array(cfg.buffer_size)
	socket.buffer = Buffer.from(arr.buffer, "binary")
	socket.buffer.len = 0 // due to Buffer's nature we have to keep track of buffer contents ourself

	_log('New client: ' + socket.remoteAddress + ':' + socket.remotePort + ' at ' + (new Date().toISOString()))

	socket.on('data', function (dataRaw) { // dataRaw is an instance of Buffer as well
		if (dataRaw.length > (cfg.buffer_size - socket.buffer.len)) {
			_log("Message doesn't fit the buffer. Adjust the buffer size in configuration")
			socket.buffer.len = 0 // trimming buffer
			return false
		}

		socket.buffer.len += dataRaw.copy(socket.buffer, socket.buffer.len) // keeping track of how much data we have in buffer

		var start
		var end
		var str = socket.buffer.slice(0, socket.buffer.len).toString("binary")

		if ((start = str.indexOf('__SUBSCRIBE__')) !== -1 && (end = str.indexOf('__ENDSUBSCRIBE__')) !== -1) {
			// if socket was on another channel delete the old reference
			if (socket.channel && sockets[socket.channel] && sockets[socket.channel][socket.connectionId]) {
				delete sockets[socket.channel][socket.connectionId]
			}
			
			var msg = str.substr(start + 13, end - (start + 13))
			
			//msg: channel=username=password
			socket.channel = msg.split("=")[0]
			
			socket.write('Hello. Noobhub online. \r\n')
			
			str = str.substr(end + 16)	// cut the message and remove the precedant part of the buffer since it can't be processed
			socket.buffer.len = socket.buffer.write(str, 0, 'binary')
			
			//create channel
			if (sockets[socket.channel] == null) {
				sockets[socket.channel] = { }
				
				channelSettings[socket.channel] = {level:0, password:msg.split("=")[2] || ""}
				
				stats.channelCreations++
			} else {
				if (msg.split("=")[2] !== channelSettings[socket.channel].password) {
					socket.write('__MSG__START__ewrong_password__MSG__END__')
					_log('Client tried to subscribe for channel: "' + socket.channel + '" with wrong password')
					return
				}
			}
			stats.clientConnects++
			
			//connect client
			sockets[socket.channel][socket.connectionId] = {socket:socket, ID:(channelSettings[socket.channel].level > 0 ? msg.split("=")[1] : socket.connectionId)}
			
			_log('Client subscribes for channel: "' + socket.channel + '" with settings level ' + channelSettings[socket.channel].level + " and username=" + msg.split("=")[1])
			
			//set first user to admin (or all when selected)
			if (Object.keys(sockets[socket.channel]).length === 1) {
				sockets[socket.channel][socket.connectionId].admin = "true"
			}
			
			//send all admins the connectionID
			var subscribers = Object.keys(sockets[socket.channel])
			for (var i = 0, l = subscribers.length; i < l; i++) {
				if (sockets[socket.channel][ subscribers[i] ].admin === "true") {
					sockets[socket.channel][ subscribers[i] ].socket.isConnected && sockets[socket.channel][ subscribers[i] ].socket.write('__MSG__START__c' + socket.connectionId + "=" + msg.split("=")[1] + '__MSG__END__')
				}
			}
		}
		
		var timeToExit = true
		do {	// this is for a case when several messages arrived in buffer
			if ((start = str.indexOf('__MSG__START__')) !== -1 && (end = str.indexOf('__MSG__END__')) !== -1) {
				var command = str.substr(start + 14, 1)
				var msg = str.substr(start + 15, end - (start + 15))
				if (cfg.verbose_adv) {
					_log('Client posts: (' + command + ') ' + msg.substr(0, 128))
				}
				
				str = str.substr(end + 12)
				socket.buffer.len = socket.buffer.write(str, 0, 'binary')
				
				if (command === "m") {
					stats.bytesReceived += msg.length
					stats.packetsReceived++
					
					//filter detection
					var filterID
					var filterValue
					if (msg.substr(0, 1) === "-") {
						msg = msg.substr(1)
					} else {
						var eq = msg.indexOf("=")
						var end = msg.indexOf(":")
						filterID = msg.substr(0, eq)
						filterValue = msg.substr(eq+1, end-eq-1)
						msg = msg.substr(end+1)
					}
					
					//add the user ID from where the message came
					msg = sockets[socket.channel][socket.connectionId].ID + "=" + msg
					
					// writing this message to all sockets with the same channel and correct filter
					var subscribers = Object.keys(sockets[socket.channel])
					stats.bytesSent += msg.length * (subscribers.length-1)
					stats.packetsSent += (subscribers.length-1)
					for (var i = 0, l = subscribers.length; i < l; i++) {
						if ((filterID == null || sockets[socket.channel][ subscribers[i] ][filterID] === filterValue) && socket.connectionId !== sockets[socket.channel][ subscribers[i] ].socket.connectionId) {
							sockets[socket.channel][ subscribers[i] ].socket.isConnected && sockets[socket.channel][ subscribers[i] ].socket.write('__MSG__START__m' + msg + '__MSG__END__', 'binary')
						}
					}
				} else if (command === "f") {
					if (sockets[socket.channel][socket.connectionId].admin == "true") {
						var filter = msg.split("=")
						if (sockets[socket.channel][filter[0]]) {
							_log('Client sets ' + filter[0] + 's filter "' + filter[1] + '" to "' + filter[2] + '"')
							
							sockets[socket.channel][filter[0]][filter[1]] = filter[2]
							
							timeToExit = false
						} else {
							_log('Client tried to set filter of non existing client ' + filter[0])
						}
					} else {
						_log('Client tried to set filter without permissions')
					}
				} else if (command === "p") {
					//change password
					if (sockets[socket.channel][socket.connectionId].admin == "true") {
							channelSettings[socket.channel].password = msg || "";
							_log('password updated')
					} else {
						_log('Client tried to set password without permissions')
					}
				} else if (command === "u") {
					// return all logged in user
					_log('Client requested user list')
					var s = ""
					var subscribers = Object.keys(sockets[socket.channel])
					for (var i = 0, l = subscribers.length; i < l; i++) {
						s = s + subscribers[i] + "=" + sockets[socket.channel][ subscribers[i] ].ID + "=" + sockets[socket.channel][ subscribers[i] ].admin + ";"
					}
					socket.write('__MSG__START__u' + s + '__MSG__END__')
				} else if (command === "s") {
					// complete network stats
					if (sockets[socket.channel][socket.connectionId].admin == "true") {
						_log('Client requested noobhub stats')
						var s = ""
						s += "bytesSent=" + stats.bytesSent + ";";
						s += "bytesReceived=" + stats.bytesReceived + ";";
						s += "packetsSent=" + stats.packetsSent + ";";
						s += "packetsReceived=" + stats.packetsReceived + ";";
						s += "clientConnects=" + stats.clientConnects + ";";
						s += "channelCreations=" + stats.channelCreations + ";";
						s += "openChannels=" + Object.keys(sockets).length + ";";
						socket.write('__MSG__START__s' + s + '__MSG__END__')
					} else {
						_log('Client requested user list without permissions')
					}
				}
				
				timeToExit = false
			} else {
				timeToExit = true
			}
		} while (!timeToExit)
	}) // end of	socket.on 'data'

	socket.on('error', function () { return _destroySocket(socket) })
	socket.on('close', function () { return _destroySocket(socket) })
}) //	end of server.on 'connection'

var _destroySocket = function (socket) {
	if (!socket.channel || !sockets[socket.channel] || !sockets[socket.channel][socket.connectionId]) return

	_log(sockets[socket.channel][socket.connectionId].ID + ' has been disconnected from channel ' + socket.channel)
	
	//notify admins that a user lost connection
	var subscribers = Object.keys(sockets[socket.channel])
	for (var i = 0, l = subscribers.length; i < l; i++) {
		if (sockets[socket.channel][ subscribers[i] ].admin === "true" && socket.connectionId !== sockets[socket.channel][ subscribers[i] ].socket.connectionId) {
			sockets[socket.channel][ subscribers[i] ].socket.isConnected && sockets[socket.channel][ subscribers[i] ].socket.write('__MSG__START__l' + sockets[socket.channel][socket.connectionId].ID + '__MSG__END__')
		}
	}
	
	sockets[socket.channel][socket.connectionId].socket.isConnected = false
	sockets[socket.channel][socket.connectionId].socket.destroy()
	sockets[socket.channel][socket.connectionId].socket.buffer = null
	delete sockets[socket.channel][socket.connectionId].socket.buffer
	delete sockets[socket.channel][socket.connectionId]

	if (Object.keys(sockets[socket.channel]).length === 0) {
		delete sockets[socket.channel]
		delete channelSettings[socket.channel]
		_log('empty channel wasted')
	}
}

var stats = {
	bytesSent: 0,
	bytesReceived: 0,
	packetsSent: 0,
	packetsReceived: 0,
	clientConnects: 0,
	channelCreations: 0,
}

server.on('listening', function () { console.log('NoobHub on ' + server.address().address + ':' + server.address().port) })
server.listen(cfg.port, '::')