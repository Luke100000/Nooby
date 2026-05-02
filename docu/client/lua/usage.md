# Lua Client Usage

The Lua client is located in `client/lua/`. The required files are `nooby.lua`, `noobyThread.lua`, `buffer.lua`, and `messagePack.lua`.

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
	hostOnly = true,
	data = {
		map = "xyz",
	},
})

-- Wait up to 3 seconds for the channel join confirmation.
local header, payload = noobyHost:demand(3)
assert(header and header.m == "connected", "Hmm, connection failed")

-- This is the host's unique ID and the new channel name.
-- The channel name can also be retrieved with the getChannels module.
local userId = header.u
local hostId = header.host
local channelName = header.channel

-- Set tags used for message filtering.
noobyHost:send({ m = "tag", tag = "filter", value = "test" })

-- Open a second connection for a client.
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

By default, the Lua client uses the bundled MessagePack encoder for payloads. This is compatible with Lua and LuaJIT.

When running on LuaJIT with `string.buffer` available, its encoder can be significantly faster.

```lua
local buffer = require("string.buffer")
nooby:setEncoderDecoder(buffer.encode, buffer.decode)
```

You can also provide a custom encoder and decoder that map a `table` to a `string` and back.
