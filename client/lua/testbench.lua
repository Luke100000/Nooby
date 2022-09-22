--[[
testing various commands
--]]

io.stdout:setvbuf("no")
local inspect = require("inspect")

-- open connection, connect to channel
local noobyHost = require("nooby")("localhost", 25000)

-- connect to a new channel with (optional) password and channel settings (settings only work on new channels)
noobyHost:connect(false, "password", {
	visible = true,
	password = "password",
	game = "Your Game",
	description = "Playing on map xyz!",
})

-- wait 3 seconds for channel join confirmation
local header, payload = noobyHost:demand(3)
assert(header and header.m == "connected", "Hmm, connection failed")

-- that's the hosts unique id and the new channels name! The channel name can also be retrieved by the getChannels module.
local userId = header.u
local channelName = header.channel

-- setting some tags
noobyHost:send({ m = "tag", tag = "filter", value = "test" })

-- open a second connection for a client
-- here I use a host-clients model, but a purely p2p model would also work
local noobyClient = require("nooby")("localhost", 25000)
noobyClient:connect(channelName, "password")

-- wait 3 seconds for channel join confirmation
local header, payload = noobyClient:demand(3)
assert(header and header.m == "connected", "Hmm, connection failed (" .. inspect(header or payload) .. ")")

-- sending a welcome message too everyone else, no header required
noobyClient:send({ t = { filter = "test" } }, { data = "Welcome!" })

-- server loop, will print the clients welcome message
while true do
	local header, payload = noobyHost:demand()
	if header then
		-- incoming data
		print(inspect(header), inspect(payload))
	elseif header == false then
		-- something went wrong, usually connection issues
		print(payload)
	end
end