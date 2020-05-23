var subscribe = function(socket, json, data){
	// if socket was on another channel delete the old reference
	if (socket.channel && sockets[socket.channel] && sockets[socket.channel][socket.connectionId]) {
		delete sockets[socket.channel][socket.connectionId]
	}
	
	socket.channel = json.channel		//set new channel
	socket.write('Hello. Nooby online. \r\n')
	
	//create channel
	if (sockets[socket.channel] == null) {
		sockets[socket.channel] = { }
		
		channelSettings[socket.channel] = {level:0, password:msg.split("=")[2] || ""}
		stats.add("channels", 1)
	} else {
		if (msg.split("=")[2] !== channelSettings[socket.channel].password) {
			socket.write('__MSG__START__ewrong_password__MSG__END__')
			_log('Client tried to subscribe for channel: "' + socket.channel + '" with wrong password')
			return
		}
	}
	stats.add("users", 1)
	
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

var message = function(socket, json, data){
	console.log("message Income:", data)
}

var auto = {		//left ist the name of the function from outside, right the name of the function in this file
	subscribe:subscribe,
	msg:message
}

var extract = function(str, start, end){
	//extract msg and delete it from buffer  (in msg are no MSG headers anymore)
	var msg = str.substring(start+param.MSG_START.length, end)
	stats.add("msgIn", 1)
	str = str.substr(end+param.MSG_END.length)
	
	//extract json and data (data will be saved in msg)
	var jsonString = msg.substring(0, msg.indexOf(param.JSON))
	var json;
	try{
		json = JSON.parse(jsonString)
	} catch(err){
		json = false
	}
	msg = msg.substring(msg.indexOf(param.JSON)+param.JSON.length, msg.indexOf(param.JSON)+param.JSON.length+json.length)
	
	return [str, json, msg];
}

var socketData = function(socket, dataRaw){
	if (dataRaw.length > (cfg.buffer_size - socket.buffer.len)) {
		_log("Message doesn't fit the buffer. Adjust the buffer size in configuration")
		socket.buffer.len = 0 // trimming buffer
		return false
	}

	socket.buffer.len += dataRaw.copy(socket.buffer, socket.buffer.len) // keeping track of how much data we have in buffer
	stats.add("dataIn", dataRaw.length)  //stats

	var start
	var end;
	var str = socket.buffer.slice(0, socket.buffer.len).toString("binary")
	
	while(true) {	// this is for a case when several messages arrived in buffer
		if ((start = str.indexOf(param.MSG_START)) !== -1 && (end = str.indexOf(param.MSG_END)) !== -1) {
			//extract message and json
			var v = extract(str, start, end)
			str = v[0]; var json = v[1]; var msg = v[2];
			socket.buffer.len = socket.buffer.write(str, 0, 'binary')		//renew str in socket	(??why??)
			
			//run command
			auto[json.c](socket, json, msg);
		}
		else{
			//no fully msg in in the buffer, break the while
			break;
		}
	}
}
module.exports = {
	auto,
	extract,
	socketData,
}