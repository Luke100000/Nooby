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

# Requirements

Node.js and npm.

# Server installation

Download/clone the server directory and run the `noobdy.js` entry point. All npm packages will be installed automatically.

```bash
git clone https://github.com/Luke100000/Nooby
cd server
nodejs ./nooby.js
```

# Configuration

[server/config.json](server/config.json)

- `logging`: additional information will be printed to the console.
- `verbose`: every header of incoming and outgoing messages will be printed.

- `portTCP`: The port of the TCP Socket
- `portWebSocket`: The port of the WebSocket
