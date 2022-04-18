local dir = (...):match("(.*/)") or ""

local nooby = { }
local meta = { }

function nooby(server, port, channel, compression, compressionLevel)
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
        session = os.clock(),
        compression = compression or "lz4",
        compressionLevel = compressionLevel or -1,
    }

    --thread communication
    self.channel_send = love.thread.newChannel()
    self.channel_receive = love.thread.newChannel()

    --thread
    self.thread = love.thread.newThread(dir .. "/noobyThread.lua")
    self.thread:start(dir, self.channel_send, self.channel_receive, self.server, self.port, self.settings)

    return setmetatable(self, { __index = meta })
end

function meta:send(header, data)
    self.channel_send:push({ header, data })
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