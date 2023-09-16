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


# client/lua/usage

```js
let noobyClient = new nooby;    //define the nooby class
let wrapper = {                 //with the wrapper you say noobyClient, what to do, when noobyClient gets a message
    onmessage: function (header, payload) {
        console.log('HEADER', header.m, payload)
        document.getElementById("console").innerHTML = header.m + ": " + JSON.stringify(header) + ": " + JSON.stringify(payload);
    },
    log: function () {
        console.log(arguments[0])
        //document.getElementById("console").innerHTML = arguments[0]
    }
}
noobyClient.init(wrapper, "localhost", "25002");  //initialise the client. The Port must be WebSocket

noobyClient.send(header, data)    //send `header`, and `data`
```