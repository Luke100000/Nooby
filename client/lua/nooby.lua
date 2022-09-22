local dir = (...):match("(.*/)") or ""

local nooby = { }
local meta = { }

function nooby(server, port, compression, compressionLevel)
	assert(server, "address required")
	assert(port, "port required")
	
	local self = { }
	
	--received messages
	self.messages = { }
	
	--settings
	self.server = server
	self.port = port
	self.settings = {
		channel = channel,
		settings = settings,
		compression = compression or "lz4",
		compressionLevel = compressionLevel or -1,
	}
	
	--thread communication
	self.sendChannel = love.thread.newChannel()
	self.receiveChannel = love.thread.newChannel()
	
	--thread
	self.thread = love.thread.newThread(dir .. "/noobyThread.lua")
	self.thread:start(dir, self.sendChannel, self.receiveChannel, self.server, self.port, self.settings)
	
	self.connected = false
	
	return setmetatable(self, { __index = meta })
end

function meta:connect(channel, password, settings)
	assert(not self.connected, "Do not connect twice, the required logic for a switch has not been implemented yet.")
	self.connected = true
	
	if password and not channel then
		settings = settings or { }
		settings.password = settings.password or password
	end
	
	self.sendChannel:push({
		{
			m = "connect",
			channel = channel,
			password = password,
			settings = settings,
		}
	})
end

function meta:send(header, data)
	self.sendChannel:push({ header, data })
end

function meta:disconnect()
	self.sendChannel:push("disconnect")
	self.__index = function()
		error("connected closed")
	end
end

function meta:demand(timeout)
	local msg
	if not timeout or timeout > 0 then
		msg = self.receiveChannel:demand(timeout)
	else
		msg = self.receiveChannel:pop()
	end
	
	if type(msg) == "string" then
		return false, msg
	elseif msg then
		return msg[1], msg[2]
	end
end

function meta:receive()
	return self:demand(0)
end

return nooby