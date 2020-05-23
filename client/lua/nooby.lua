--[[
#  _   _  ____   ____  ______     __
# | \ | |/ __ \ / __ \|  _ \ \   / /
# |  \| | |  | | |  | | |_) \ \_/ / 
# | . ` | |  | | |  | |  _ < \   /  
# | |\  | |__| | |__| | |_) | | |   
# |_| \_|\____/ \____/|____/  |_|   

Opensource multiplayer and network messaging for Lua

@usage
require("noobhub")

@authors
Luke100000
Thecoolpeople

@license MIT
--]]

local dir = (...):match("(.*/)") or ""

require(dir .. "/json")
require(dir .. "/saveTableBinary")

local socket = require("socket")

local nooby = { }
local meta = { }

function nooby(server, port)
	assert(server, "address required")
	assert(port, "port required")
	
	local self = { }
	self.buffer = ""
	
	self.server = server
	self.port = port
	
	--try to connect
	local error_message
	self.sock, error_message = socket.connect(self.server,  self.port)
	
	if (self.sock == nil) then
		print("Nobby failed to connect: " .. error_message)
		return false
	end
	
	self.sock:setoption("tcp-nodelay", true)
	self.sock:settimeout(0)
	
	local input, output = socket.select(nil, {self.sock}, 3)
	for i,v in ipairs(output) do
		v:send(meta:pack({test = "test"}, {test = "test"}))
	end
	
	return setmetatable(self, meta)
end

function meta:pack(header, data)
	local data_data = table.saveBinary(data)
	
	if #data_data > 128 then
		data_data = love.data.compress("string", "lz4", data_data, 1)
	end
	
	header.l = #data_data
	
	local json_data = json.encode(header)
	
	local typ = 0
	local length = #json_data
	
	local header = string.char(typ) .. string.char(math.floor(length / 65536)) .. string.char(math.floor(length / 256) % 256) .. string.char(length % 256)
	
	return header .. json_data .. data_data
end

function meta:deconnect()
	if self.sock then
		self.sock:close()
		self.sock = nil
	end
	
	self.buffer = ""
end

function meta:publish(message)
	if (self.sock == nil) then
		print "NoobHub: Attempt to publish without valid subscription (bad socket)"
		self:reconnect()
		return false;
	end
	local send_result, message, num_bytes = self.sock:send("__JSON__START__"..json.encode(message.message).."__JSON__END__")
	if (send_result == nil) then
		print("Noobhub publish error: "..message..'  sent '..num_bytes..' bytes');
		if (message == 'closed') then  self:reconnect() end
		return false;
	end
	return true
end

function meta:enterFrame()
	local input,output = socket.select({ self.sock },nil, 0) -- this is a way not to block runtime while reading socket. zero timeout does the trick

	for i,v in ipairs(input) do  -------------
		local got_something_new = false
		while  true  do
			local skt, e, p = v:receive()
			if (skt) then  self.buffer = self.buffer .. skt;  got_something_new=true;  end
			if (p) then  self.buffer = self.buffer .. p;  got_something_new=true;  end
			if (not skt) then break; end
			if (e) then break; end
		end
		
		while got_something_new do  --  this is for a case of several messages stocker in the buffer
			local start = string.find(self.buffer,'__JSON__START__')
			local finish = string.find(self.buffer,'__JSON__END__')
			if (start and finish) then -- found a message!
				local message = string.sub(self.buffer, start+15, finish-1)
				self.buffer = string.sub(self.buffer, 1, start-1)  ..   string.sub(self.buffer, finish + 13 ) -- cutting our message from buffer
				local data = json.decode(message)
				self.callback(  data  )
			else
				break
			end
		end
	end
end

return nooby