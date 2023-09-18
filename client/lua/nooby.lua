local dir = (...):match("(.*/)") or ""

---@class NoobySettings
---@field compression "lz4" | "zlib" | "gzip"
---@field compressionLevel number
local defaultSettings = {
	compression = "lz4",
	compressionLevel = -1,
}

---@class Nooby
---@field server string
---@field port number
---@field private sendChannel love.Channel
---@field private receiveChannel love.Channel
---@field connected boolean True when the instance is currently connected to a channel
local meta = {}

---Creates a new Nooby connection instance
---@param server string
---@param port number
---@param settings NoobySettings | nil
---@return Nooby
function meta:new(server, port, settings)
	assert(server, "Address required")
	assert(port, "Port required")

	-- default settings
	settings = setmetatable(settings or {}, { __index = defaultSettings })

	---@type Nooby
	local instance = {
		--settings
		server = server,
		port = port,
		settings = settings,

		--thread communication
		sendChannel = love.thread.newChannel(),
		receiveChannel = love.thread.newChannel(),

		--thread
		thread = love.thread.newThread(dir .. "/noobyThread.lua"),

		--status
		connected = false
	}

	--start thread
	instance.thread:start(dir, instance.sendChannel, instance.receiveChannel, instance.server, instance.port,
		instance.settings)

	return setmetatable(instance, { __index = meta })
end

---Connect to a channel
---@param channel string | nil
---@param password string | nil
---@param settings table | nil
function meta:connect(channel, password, settings)
	assert(not self.connected, "Do not connect twice, create a separate Nooby instance and disconnect this one.")
	self.connected = true

	if password and not channel then
		settings = settings or {}
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

---Sends a message with 
function meta:send(header, data)
	self.sendChannel:push({ header, data })
end

---Disconnects from the channel
function meta:disconnect()
	self.sendChannel:push("disconnect")
	self.__index = function()
		error("connected closed")
	end
end

---Wait for a message with optional timeout
---@param timeout number
---@return boolean | nil
---@return table | nil
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
	else
		return nil, nil
	end
end

---Pops a message from the receive queue
---@return boolean|nil
function meta:receive()
	return self:demand(0)
end

return setmetatable(meta, { __call = meta.new })
