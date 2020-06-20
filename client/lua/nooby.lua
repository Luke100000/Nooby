--[[
#  _   _  ____   ____  ______     __
# | \ | |/ __ \ / __ \|  _ \ \   / /
# |  \| | |  | | |  | | |_) \ \_/ / 
# | . ` | |  | | |  | |  _ < \   /  
# | |\  | |__| | |__| | |_) | | |   
# |_| \_|\____/ \____/|____/  |_|   

Opensource multiplayer and network messaging for Lua

@usage
local nooby = require("nooby")(server, port)

@authors
Luke100000
Thecoolpeople

@license MIT
--]]

local dir = (...):match("(.*/)") or ""

local nooby = { }
local meta = { }

local session = 0

function nooby(server, port, channel, packer, compression, compressionLevel)
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
		session = require("socket").dns.gethostname() .. "_" .. session,
		packer = packer or "packTable",
		compression = compression or "lz4",
		compressionLevel = compressionLevel or -1,
	}
	
	session = session + 1
	
	--thread communication
	self.channel_send = love.thread.newChannel()
	self.channel_receive = love.thread.newChannel()
	
	--thread
	self.thread = love.thread.newThread(dir .. "/noobyThread.lua")
	self.thread:start(dir, self.channel_send, self.channel_receive, self.server, self.port, self.settings)
	
	return setmetatable(self, {__index = meta})
end

function meta:send(json, data)
	self.channel_send:push({json, data})
end

function meta:disconnect()
	self.channel_send:push("disconnect")
	self.__index = function()
		error("connected closed")
	end
end

function meta:receive()
	local msg = self.channel_receive:pop()
	
	if type(msg) == "string" then
		return false, msg
	else
		return msg
	end
end

return nooby