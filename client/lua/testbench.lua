--[[
testing various commands
--]]

-- open connection, connect to channel
local nooby = require("nooby")("localhost", 25000, "some global channel")

-- wait 3 seconds for channel join confirmation
local header, payload = nooby:demand(3)
assert(header and header.m == "connected", "Hmm, connection failed")
local userId = header.u

-- setting some tags
nooby:send({ m = "tag", tag = "filter", value = "test" })

-- sending a welcome message too everyone else, no header required
nooby:send(false, { data = "Welcome!" })

-- awaiting other messages
while true do
	local header, payload = nooby:receive()
	if header then
		-- incoming data
		print(payload.data)
		io.flush()
	elseif header == false then
		-- something went wrong, usually connection issues
		print(payload)
		io.flush()
	else
		-- nothing new
		love.timer.sleep(1)
		
		-- send stuff to everyone with the same tags
		nooby:send({ tags = { filter = "test" } }, { data = "Hey, I'm user " .. userId })
	end
end