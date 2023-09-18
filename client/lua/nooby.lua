local dir = (...):match("(.*/)") or ""

---@class NoobySettings
---@field compression "none" | "lz4" | "zlib" | "gzip"
---@field compressionLevel number
local defaultSettings = {
	compression = "none",
	compressionLevel = -1,
}

---@class Nooby
---@field server string
---@field port number
---@field private sendChannel love.Channel  | nil
---@field private receiveChannel love.Channel | nil
---@field private thread love.Thread | nil
---@field settings table
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

	--Default settings
	settings = setmetatable(settings or {}, { __index = defaultSettings })

	---@type Nooby
	local instance = {
		--Settings
		server = server,
		port = port,
		settings = settings,

		--Status
		connected = false
	}

	return setmetatable(instance, { __index = meta })
end

---Launches the thread and establish a connection
function meta:startThread()
	-- Communication
	self.sendChannel = love.thread.newChannel()
	self.receiveChannel = love.thread.newChannel()

	--Thread
	self.thread = love.thread.newThread(dir .. "/noobyThread.lua")

	--Start thread
	self.thread:start(dir, self.sendChannel, self.receiveChannel, self.server, self.port, self.settings)
end

---Connect to a channel
---@param channel string | nil
---@param password string | nil
---@param settings table | nil
function meta:connect(channel, password, settings)
	assert(not self.connected, "Already connected, disconnect first!")
	self.connected = true

	--Start the worker thread
	self:startThread()

	--If joining a new private channel (no channel name given), but a password, then lets set the password setting as well
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
	assert(self.connected, "Not connected")
	self.sendChannel:push({ header, data })
end

---Close the instance and shuts down the thread
function meta:disconnect()
	assert(self.connected, "Not connected")
	self.connected = false
	self.sendChannel:push("disconnect")
end

---Wait for a message with optional timeout
---@param timeout number
---@return boolean | nil
---@return table | nil
function meta:demand(timeout)
	assert(self.connected, "Not connected")

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
