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


# client/js/usage

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