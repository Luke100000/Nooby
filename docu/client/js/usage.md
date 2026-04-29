# JavaScript Client Usage

The JavaScript client is a work in progress. The current browser API initializes a `NoobyClient` instance with callbacks and a WebSocket endpoint.

```js
let noobyClient = new NoobyClient();

let wrapper = {
  onmessage: function (header, payload) {
    console.log("HEADER", header.m, payload);
    document.getElementById("console").innerHTML =
      header.m + ": " + JSON.stringify(header) + ": " + JSON.stringify(payload);
  },
  log: function () {
    console.log(arguments[0]);
  },
};

// The port must be the WebSocket port configured on the server.
noobyClient.init(wrapper, "localhost", "25002");

// Send header and payload data.
noobyClient.send(header, data);
```
