# Nooby

Extendable Node.js messaging server designed for easy client to client applications.

Communication uses [MessagePack](https://msgpack.org/index.html) and TCP, WebSocket and a simple packet format and
therefore works for a wide variety of
clients.

Client implementations provided for Lua. JavaScript is WIP.

An example chat software, benchmarks and test bench is provided for Lua. JavaScript is WIP.

[![Project license](https://img.shields.io/github/license/Luke100000/Nooby?style=flat-square)](https://github.com/Luke100000/Nooby/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Luke100000/Nooby?style=flat-square&logo=github)](https://github.com/Luke100000/Nooby/stargazers)

# Concept

The concept is a peer to peer packet messenger, with a server used to avoid direct connections.
Usage should be simple and generic, yet stable and secure with reasonably [performance](#performance).

A Nooby server can be reused for multiple projects and handles common logic like login, session creation, game lobby
queries etc. It also offloads the broadcasting of data to a server with potential better
bandwidth.

Clients send packages, which consist of two parts: the header and the payload.
The header is meant for the server and specifies the type of packet and how to treat it. The payload is forwarded to the
other clients and can contain any type of data (including binary). It is recommended to also use MsgPack here.

Usually, messages do not confirm successful operations, but instead return errors otherwise.

# Modules

Nooby comes with a few inbuilt modules. The header contains required fields.

* `m` the module responsible for processing, or the type of answer. Default is `message`. May also be an alias to save
  some bytes.
* `u` the user the response originated from, might be the sender in case of errors or pings.

## Connect

Connect to a channel, disconnects from the old one if already connected. If multiple channels are required, multiple
connections should be opened instead.

If the channel name is omitted, a random channel is created. The creators admin tag is set to true (See (
permissions)[#permissions]).

Otherwise, the user joins or creates a public channel, assuming the optional password is correct.

Public channels are meant to be used for lobbies or global chats. Nobody can change settings on such a channel.

Alias `c`

* `channel` (optional) the channel name to connect
* `password` (optional) password if the channel is password protected
* `settings` (optional) a table containing channel settings, only when creating a private channel ((
  settings)[#settings])

### Response

* `channel` the channel name chosen when creating a new channel

## Message

Default module used to broadcast data to all clients, except the sender.

Alias `m`, `(default)`

* `t` (optional) a dictionary of tags to be fulfilled

## DirectMessage

Sends a message directly to a single client.

Alias `dm`

* `u` the user ID to send to

## Tag

Set tags for a single user.

Required permission level 1, or 2 when specifying a specific user.

Alias `t`

* `u` the user to set the tags for, or empty to set on yourself.
* `tag` the tag identifier
* `value` the tags value, or empty to unset

## Ping

Pong. Sends back the payload.

### Response

See (GetTags)[#GetTags].

## GetTags

Retrieves all current tags for a user.

Required permission level 1.

### Response

* `tags` the entire tag directory currently set.

# Responses

Client only response.

## Error

* `reason` the reason for the error
    * e.g. `permission denied`
* `header` the header responsible for the error

## Shutdown

Server has been shut down.

# Permissions

Some modules require a permission level. Having the `admin` tag grants level 2, being on a public server grants level 1,
everyone else has level 0.

# Performance

The Lua Client has been benchmarked local and on a test server with 30 ms ping and a 45/10 Mbit/s bandwidth.

Tests were performed on packages and raw data with different sizes, with and without header.

-- todo

## Local

# Lua Client

Located in `client/lua/`, with `nooby.lua`, `noobyThread` and `messagePack.lua` the required files.

```lua
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
```

# Javascript Client

WIP

```js
let noobyClient = new nooby;    //define the nooby class
let wrapper = {                 //with the wrapper you say noobyClient, what to do, when noobyClient gets a message
    onmessage: function (msg) {
        console.log("[nooby] data received", msg)
    }
}
noobyClient.init(wrapper, "localhost", "25002");  //initialise the client. The Port must be WebSocket

noobyClient.send(header, data)    //send `header`, and `data`
```

# Server

Start the server using nodejs.

```bash
cd server
nodejs ./nooby.js
```

## Settings

[server/config.json](server/config.json)

- `logging`: additional information will be printed to the console.
- `verbose`: every header of incoming and outgoing messages will be printed.

- `portTCP`: The port of the TCP Socket
- `portWebSocket`: The port of the WebSocket

## Own Modules

To get the module working, you have to put it into the `nooby_modules` folder. The name could be "myModule.js"
In aliases, you can define alternative, shorter identifiers, but make sure to avoid duplicates.

```js
let init = function (env) {
    // populate the environment at server load with module specific variables
}

let receive = function (env, client, msg) {
    // messages received from client
}

// the (short) name of the module as specified in a packets header
let aliases = ["mm"]

module.exports = {
    init,
    receive,
    aliases,
}
```

# Packet Format

This section is only relevant when writing an own client and describes the binary representation of a packet.

Data is transmitted from server to client in chunks, no bigger than `256^2` bytes:

- `{userId}{chunkSize}{chunk}`
  Messages from different users may interleave, therefore every user needs to concat chunks in its own buffer.

Data is directly transmitted from client to server as data can not interleave.

One or more chunks may form a message:

- `{headerLength}{payloadLength}{header}{payload}`

`headerLength` 2 byte length of the header data    
`payloadLength` 4 bytes length of the payload  
`header` is a messagePacked header containing module related data
`payload` is the payload, its length is specified in the header and usage is completely up to the client

It is common, but not required, that the payload starts with a leading byte defining its compression state:

- `0` uncompressed
- `1` LZ4
- `2` zlib
  The actual payload is also a MsgPack object