# Table of contents

[home](/README.md)

- server
  - [installation](/docu/server/installation.md)
  - [benchmark](/docu/server/benchmark.md)
  - [modules](/docu/server/modules.md)
  - [specification](/docu/server/specification.md)
- client
  - [Lua Client](/docu/client/lua/usage.md)
  - javascript
    - [Client Javascript Installation](/docu/client/js/installation.md)
    - [Client Javascript Usage](/docu/client/js/usage.md)

# Lua

Located in `client/lua/`, with `nooby.lua`, `noobyThread.lua` and `messagePack.lua` the required files.

This is an example communication between a host creating a channel and a client sending its first message.

```lua
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
-- notice that there is no difference between hosts or clients, the term host only indicates who originally opened the channel
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
```

## Custom encoder

By default the `string.buffer` encoder from LuaJIT is used to en- and decode payloads, which is by far the fastest serializer available.

You may want to use the bundled MessagePack library, which is also used for the header data instead for a platform independend solution:

```lua
nooby:setEncoderDecoder(nooby.messagePackEncoder, nooby.messagePackDecoder)
```

Or implement and provide a custom one, mapping a `table` to a `string` and vice versa.