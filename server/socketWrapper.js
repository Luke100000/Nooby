class Msg {
	/*
		Header:	(4 Byte)
			1 Byte type		-> 0 "normal on everyone in channel"  ->1:  json     ->2: checkAlive
			3 Byte length (either JSON if present or DATA, use JSON entry instead
	*/
	
	constructor() {
		this.data = false
		this.json = {}
	}
}

class Wrapper {
	constructor(cfg, callbacks) {
		this.clients = []
		this.lastID = 0
		this.cfg = {}
		
		this.cfg = cfg
		this.callbacks = callbacks
		
		new (require("./sockets/tcp.js"))(this, cfg.portTCP)      //include tcp socket
		new (require("./sockets/udp.js"))(this, cfg.portUDP)      //include udp socket
		new (require("./sockets/web.js"))(this, cfg.portWEB)      //include web socket
	}
	
	//generate unique ids
	getID = function() {
		this.lastID++;
		return this.lastID;
	}

	newClient = function(client) {
		client.buffer = Buffer.allocUnsafe(cfg.bufferSize);
		client.bytesReceived = 0

		this.clients.push(client)
		this.callbacks.newClient(client)
	}

	checkAlive = function(client) {
		var MSGSendAlive = ""			//TODO
		sendClient(client, MSGSendAlive)
	}
	
	receive = function(client, data) {
		client.lastMsg = new Date();

		//append data
		client.bytesReceived += data.copy(client.buffer, client.bytesReceived)

		//either wait until packet is there, or start processing new data
		let run = true;
		while (run) {
			if (client.receiving) {
				switch(client.receiving.type){
					case 0:
						if(client.bytesReceived >= client.receiving.length){		//check if full json is 
							let json = client.buffer.slice(0, client.receiving.length).toString()
							//slice
							client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.length, client.bytesReceived)
							try {
								client.receiving.json = JSON.parse(json);
							} catch(err) {
								this.destroySocket(client, "JSON_malformed")
								_log("[JSON] error:", json)
								return
							}
							if(client.bytesReceived >= client.receiving.json.l){
								client.receiving.data = client.buffer.slice(0, client.receiving.length).toString()				//TODO: why toString()?
								client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.json.l, client.bytesReceived)
							}else{
								run = false
							}
						}else{
							run = false
						}
					break;
					case 1:
						if(client.bytesReceived >= (client.receiving.length + 3)){		//check if full data is received
							let u = client.buffer.readUInt8(0) * 256 * 256 + client.buffer.readUInt8(1) * 256 + client.buffer.readUInt8(2)
							client.bytesReceived = client.buffer.copy(client.buffer, 0, 3, client.bytesReceived)	//cut away user

							client.receiving.data = client.buffer.slice(0, client.receiving.length).toString()				//TODO: why toString()?
							client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.json.l, client.bytesReceived)
						}else{
							run = false
						}
					break;
					case 2:
						if(client.bytesReceived >= client.receiving.length){		//check if full data is received
							client.receiving.data = client.buffer.slice(0, client.receiving.length).toString()				//TODO: why toString()?
							client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.json.l, client.bytesReceived)
						}else{
							run = false
						}
					break;
					case 3:
						if(client.bytesReceived >= client.receiving.length){		//check if full data is received
							let json = client.buffer.slice(0, client.receiving.length).toString()
							//slice
							client.bytesReceived = client.buffer.copy(client.buffer, 0, client.receiving.length, client.bytesReceived)
							try {
								client.receiving.json = JSON.parse(json);
							} catch(err) {
								this.destroySocket(client, "JSON_malformed")
								_log("[JSON] error:", json)
								return
							}
						}else{
							run = false
						}
					break;
					case 4:
						client.receiving.i = client.receiving.length
						client.receiving.length = null
					break;
				}
				if(run){
					//pass to nooby
					this.callbacks.receive(client, client.receiving)
					client.receiving = false
				}
			} else {
				//wait for first 4 bytes
				if (client.bytesReceived >= 4) {
					let type = client.buffer.readUInt8(0)
					let length = client.buffer.readUInt8(1) * 256 * 256 + client.buffer.readUInt8(2) * 256 + client.buffer.readUInt8(3)

					//cut away type and length
					client.bytesReceived = client.buffer.copy(client.buffer, 0, 4, client.bytesReceived)
					
					//start new message
					client.receiving = new Msg()
					client.receiving.type = type
					client.receiving.length = length
				} else {
					break
				}
			}
		}
	}

	shutdown = function(){
		this.clients.forEach(client => this.send(client, {"info":"Nooby shutdown"}, ""));
	}

	destroySocket = function(client, info) {
		let i = this.clients.indexOf(client)
		if (i = null) {
			this.clients.splice(i)
			callbacks.destroySocket(client, info)
		}
	}

	msgToPacket = function(msg) {
		let type = 0
		let data = ""

		msg.json.l=msg.data.length
		let data_json = JSON.stringify(msg.json);

		let l = data_json.length
		data = String.fromCharCode(type) + String.fromCharCode(Math.floor(l / 65536)) + String.fromCharCode(Math.floor(l / 256) % 256) + String.fromCharCode(l % 256);

		data += data_json

		data += msg.data

		return data
	}
	
	send = function(client, json, data) {
		let msg = new Msg()
		msg.json = json
		msg.data = data
		client.send(client, this.msgToPacket(msg))
	}
}

setInterval(function(){
	var now = new Date();
	for (client in this.clients) {
		if (client.lastMsg - now > 10*1000){
			checkAlive(client)
		}
	}
}, 10*1000)

module.exports = {
	Wrapper,
	Msg
}