# Lua Client Usage

The Lua client is located in `client/lua/`. The required files are `nooby.lua`, `noobyThread.lua`, and `messagePack.lua`.

The following example shows a host creating a channel and a second client sending its first message.

```lua
local inspect = require("inspect")

-- Open a connection and create a channel.
local noobyHost = require("nooby")("localhost", 25000)

-- Connect to a new channel with an optional password and channel settings.
-- Settings only apply to newly created channels.
noobyHost:connect(false, "password", {
	visible = true,
	password = "password",
	game = "Your Game",
	description = "Playing on map xyz!",
})

-- Wait up to 3 seconds for the channel join confirmation.
local header, payload = noobyHost:demand(3)
assert(header and header.m == "connected", "Hmm, connection failed")

-- This is the host's unique ID and the new channel name.
-- The channel name can also be retrieved with the getChannels module.
local userId = header.u
local channelName = header.channel

-- Set tags used for message filtering.
noobyHost:send({ m = "tag", tag = "filter", value = "test" })

-- Open a second connection for a client.
-- There is no protocol-level difference between hosts and clients.
-- "Host" only describes who originally opened the channel.
local noobyClient = require("nooby")("localhost", 25000)
noobyClient:connect(channelName, "password")

-- Wait up to 3 seconds for the channel join confirmation.
local header, payload = noobyClient:demand(3)
assert(header and header.m == "connected", "Hmm, connection failed (" .. inspect(header or payload) .. ")")

-- Send a welcome message to everyone else. No module header is required.
noobyClient:send({ t = { filter = "test" } }, { data = "Welcome!" })

-- Host loop: prints the client's welcome message.
while true do
	local header, payload = noobyHost:demand()
	if header then
		-- Incoming data.
		print(inspect(header), inspect(payload))
	elseif header == false then
		-- Something went wrong, usually a connection issue.
		print(payload)
	end
end
```

## Custom encoder

By default, the LuaJIT `string.buffer` encoder is used to encode and decode payloads. It is the fastest available serializer for this client.

For a more platform-independent solution, use the bundled MessagePack library, which is also used for header data:

```lua
nooby:setEncoderDecoder(nooby.messagePackEncoder, nooby.messagePackDecoder)
```

You can also provide a custom encoder and decoder that map a `table` to a `string` and back.
