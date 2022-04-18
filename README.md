# Nooby

Extendable Node.js multiplayer messaging server suitable for client to client applications.

# DEVELOPMENT IN PROGRESS

While fully functional it lacks a few features and things might change slightly.

[![Project license](https://img.shields.io/github/license/Luke100000/Nooby?style=flat-square)](https://github.com/Luke100000/Nooby/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Luke100000/Nooby?style=flat-square&logo=github)](https://github.com/Luke100000/Nooby/stargazers)
[![Donate to this project using Paypal](https://img.shields.io/badge/paypal-donate-blue.svg?style=flat-square&logo=paypal)](https://paypal.me/pools/c/8pAvKwQbHm)

# Client

Clients send packages, which consist of two parts: the header and the data.

The header is meant for the server and specifies the type of packet. The data is forwared to the other clients and can contain any type of data (including binary, not null terminated).

The header contains data required by the modules, with following global values:

* `c` the packet type (command) and the module responsible for parsing. If not present, `m` is used.
* `l` the data segment length
* `u` the user ID the message comes from (or empty if it's a server msg)

## Inbuilt modules

Nooby comes with a few inbuilt modules.

### Msg

Default module used to transfer data to all clients

Alias `m`, `(default)`

* `tags` a dictionary of tags to be fullfilled
* `data` additional data passed to the clients, not recommended

### Connect

Connect to a channel, disconnects from the old one. If the user omits the channel the admin tag is set.

Alias `c`

* `channel` the channel name to connect, or a random free name if empty
* `session` optionally specify the client ID if several connection from the same machine are required

### DirectMessage

Sends a message directly to a single client

Alias `dm`

* `user` the user ID to send to

### Tag

Set tags for a single user.

Alias `t`

* `user` the user to set the tags for, or empty to set on yourself. Required `admin` tag set for executor and will confirm the change to all admins.
* `tag` the tag identifier
* `value` the tags value, or empty to unset

## Reponses

Some commands are client only and are used as responses for common actions.

### Connected

* `channel` for yourself the channel name is also returned, in case a random one has been requested

### Error

* `reason` the reason for the error
    * e.g. `permission denied`
* `header` the header responsible for the error

### Success

Some commands confirm themselve on success.

* `header` the successful executed commands header

### Shutdown

Server has been shut down.

## Lua

```lua
local noobyClient = require("nooby")("localhost", "25000")

-- todo
```

## Javascript

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

## Settings

[server/nooby.js Line 27](server/nooby.js#L27)

```js
cfg = {
    verbose: true,              // set to true to capture lots of debug info
    verbose_adv: false,         // advanced debug info in console

    portTCP: 25000,
    portUDP: 25001,
    portWEB: 25002,
    bufferSize: 1024 * 64,      // buffer allocated per each socket client

    checkAlive: 10 * 1000,      // check if every client is alive every 10 seconds
}
```

- `verbose: true`: important logs will be printed.
- `verbose_adv: true`: every single log will be printed.(DEBUG ONLY!!)

- `portTCP: 25000`: The port of the TCP Socket
- `portUDP: 25001`: The port of the UDP Socket
- `portWEB: 25002`: The port of the WEB Socket
- `bufferSize: 1024 * 64`: set the max size of the buffer. Messages should not be bigger than that!

- `checkAlive: false`: Nooby won't send checkAlive messages to the clients
- `checkAlive: number`: Nooby send every number ms checkAlive messages to the clients (the clients will reply them automatically see in the client folder)

## Own Modules

`myModule.js`

```js
let init = function (env) {
    // populate the environment with module specific variables
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

- To get the module working, you have to put it into the nooby_modules folder. The name could be "myModule.js"
- If you want to send a message to your module, you have to put into the `HEADER: {"c":"myModule"}`
- In aliases, you can define alternative, shorter identifiers, e.g. `HEADER: {"c":"mm"}`, but make sure to avoid duplicates.
- init
    - in `env` you can define tables for your specific module data (env won't be only for your module. So if you dont want to check if no other module hast defined that name, you can first define a table `env.myModule = {}` and then you can define your variable like `env.myModule.var` or/and table `env.myModule.table = {}`). Of course you can also use: `env.myvar` if you are sure, no other module will !init! that too.
    - will be called at noobyStart
- receive
    - in `env` you will find all the environment variables from all modules: like `env.channels` (have a look at [server/nooby_modules/connect.js](server/nooby_modules/connect.js))
    - `client` is the client itself. you can read client.userID and so on
    - `msg` is the input message.
      ```js
      Msg = {
        length: 0,    //length of header
        size: 0,      //length of data
        header: {
            c: "packetName"
        },
        data: Buffer,
        awaitingHeader: false,//internal use
        awaitingData: false   //internal use
      }
      ```

# Format of incoming message

This section is only relevant when writing an own client and desribes the binary format of the messages.

A leading byte defines the type of the message.

- `{headerLength}{header}{data}`

`headerLength` 3 byte length of the header data  
`header` is a messagePacked header containing module related data  
`data` is the binary data segment, its length is specified in the header  