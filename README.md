# Nooby
Node.js multiplayer message server suitable for client to client applications

## DEVELOPMENT IN PROGRESS
While fully functional it still lacks most features and things might change.

[![Project license](https://img.shields.io/github/license/Luke100000/Nooby?style=flat-square)](https://github.com/Luke100000/Nooby/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Luke100000/Nooby?style=flat-square&logo=github)](https://github.com/Luke100000/Nooby/stargazers)
[![Donate to this project using Paypal](https://img.shields.io/badge/paypal-donate-blue.svg?style=flat-square&logo=paypal)](https://paypal.me/pools/c/8pAvKwQbHm)

## usage Server
### Settings
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
- verbose: true: important logs will be printed. 
- verbose_adv: true: every single log will be printed.(DEBUG ONLY!!)

- portTCP: 25000: The port of the TCP Socket
- portUDP: 25001: The port of the UDP Socket
- portWEB: 25002: The port of the WEB Socket
- bufferSize: 1024 * 64: set the max size of the buffer. massages should not be bigger than that!

- check Alive: false: Nooby won't send checkAlive messages to the clients
- check Alive: number: Nooby send every number ms checkAlive messages to the clients (the clients will reply them automatically see in the client folder)

### own Modules
#### general structure of modules
myModule.js
```js
let init = function (env) {
    
}

let receive = function (env, client, msg) {
    
}

let aliases = ["mm"]

module.exports = {
    init,
    receive,
    aliases,
}
```
- To get the module working, you have to put it into the nooby_modules folder. The name could be "myModule.js"
- If you want to send a message to your module, you have to put into the `HEADER:{"cmd":"myModule"}`
- In aliases you can define aliases, so that you can have `HEADER:{"cmd":"mm"}`, but check to have no same aliases for 2 different modules
- init
  - in `env` you can define tables for your specific module data (env won't be only for your module. So if you dont want to check if no other module hast defined that name, you can first define a table `env.myModule = {}` and then you can define your variable like `env.myModule.var` or/and table `env.myModule.table = {}`). Of course you can also use: `env.myvar` if you are sure, no other module will !init! that too.
  - will be called at noobyStart
- receive
  - in `env` you will find all the environment variables from all modules: like `env.channels` (have a look at [server/nooby_modules/connect.js](server/nooby_modules/connect.js))
  - `client` is the client itself. you can read client.userID and so on
  - `msg` is the input message.
    ```js
    Msg{
      length: 0,    //internal use
      size: 10,     //internal use
      header: { cmd: 'mm' },
      data: Buffer,
      awaiting_data: false  //internal use
    }
    ```


## usage Client
### synonym HEADER:{cmd}
- c = connect
- m = msg
- t = tag

### commands
- connect to channel: `HEADER:{"cmd":"connect"}` Host get random ChannelID
- connect to channel with name: `HEADER:{"cmd":"connect", "channel":"channelname"}` Host connect to channel with name channelname
- send msg: `HEADER:{"cmd":"msg"}DATA` Send message to everyone in the channel, excluding you; you will get your data back, if you are not in a channel

### lua
```lua
local noobyClient = require("nooby")("localhost", "25000")


```

### javascript
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

## Message format packet
### format of incoming message
`CLLL{header}DATA` (one possibility)

C is the packet format
- 0    `CLLL{header}DATA`
- 1    `CLLLUUUDATA (U is the user ID)`
- 2    `CLLLDATA`
- 3    `CLLL{header}`
- 4    `CIII` (Where I is an optional indicator, used to ping)
And L the length of the next packet, either HEADER or DATA (user ID has fixed length and is exluded)
    

### user ID
integer, count up per socket connect, maxed to 3 bytes (256^3)
