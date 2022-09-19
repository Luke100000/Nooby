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
        compression = compression or "lz4",
        compressionLevel = compressionLevel or -1,
    }

    --thread communication
    self.sendChannel = love.thread.newChannel()
    self.receiveChannel = love.thread.newChannel()

    --thread
    self.thread = love.thread.newThread(dir .. "/noobyThread.lua")
    self.thread:start(dir, self.sendChannel, self.receiveChannel, self.server, self.port, self.settings)

    return setmetatable(self, { __index = meta })
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
    local msg = self.receiveChannel:demand(timeout)

    if type(msg) == "string" then
        return false, msg
    elseif msg then
        return msg[1], msg[2]
    end
end

function meta:receive()
    local msg = self.receiveChannel:pop()

    if type(msg) == "string" then
        return false, msg
    elseif msg then
        return msg[1], msg[2]
    end
end

return nooby