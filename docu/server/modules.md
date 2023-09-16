### Table of contents
[home](/README.md)
- server
  - [requirements](/docu/server/requirements.md)
  - [installation](/docu/server/installation.md)
  - [settings](/docu/server/settings.md)
  - [benchmark](/docu/server/benchmark.md)
  - [modules](/docu/server/modules.md)
  - [packageFormat](/docu/server/packageFormat.md)
- client
  - lua
    - [Client Lua Installation](/docu/client/lua/installation.md)
    - [Client Lua Usage](/docu/client/lua/usage.md)
  - javascript
    - [Client Javascript Installation](/docu/client/js/installation.md)
    - [Client Javascript Usage](/docu/client/js/usage.md)


# server/modules

Nooby comes with a few inbuilt modules. The header contains required fields.

* `m` the module responsible for processing, or the type of answer. Default is `message`. May also be an alias to save
  some bytes.
* `u` the user the response originated from, might be the sender in case of errors or pings.

## `connect`

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

## `message`

Default module used to broadcast data to all clients, except the sender.

Alias `m`, `(default)`

* `t` (optional) a dictionary of tags to be fulfilled

## `directMessage`

Sends a message directly to a single client.

Alias `dm`

* `u` the user ID to send to

## `tag`

Set tags for a single user.

Required permission level 1, or 2 when specifying a specific user.

Alias `t`

* `u` the user to set the tags for, or empty to set on yourself.
* `tag` the tag identifier
* `value` the tags value, or empty to unset

## `ping`

Pong. Sends back the payload.

## `getChannels`

Retrieves all current tags for a user.

Required permission level 1.

### Response

* `channels` a list of channels, each channel is a directory with `channel`, name, `description`, `password` (boolean),
  and `clients` (# of connected clients)

## `getTags` WIP

Retrieves all current tags for a user.

Required permission level 1.

## `getStats`

Retrieves the current networking stats.

```json
{
  "outgoingMessages": 0,
  "incomingMessages": 0,
  "outgoingBytes": 0,
  "incomingBytes": 0,
  "newConnections": 0
}
```

### Response

* `tags` the entire tag directory currently set.


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