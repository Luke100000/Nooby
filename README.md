# Nooby

Extensible Node.js messaging server for lightweight client-to-client applications.

Nooby uses [MessagePack](https://msgpack.org/index.html), TCP or WebSocket transport, and a small packet format so clients can be implemented in different languages. The Lua client is functional and includes examples, benchmarks, and a test bench. The JavaScript client is currently a work in progress.

[![Project license](https://img.shields.io/github/license/Luke100000/Nooby?style=flat-square)](https://github.com/Luke100000/Nooby/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Luke100000/Nooby?style=flat-square&logo=github)](https://github.com/Luke100000/Nooby/stargazers)

## Documentation

- Server
  - [Installation](/docu/server/installation.md)
  - [Modules](/docu/server/modules.md)
  - [Packet specification](/docu/server/specification.md)
- Clients
  - [Lua usage](/docu/client/lua/usage.md)
  - [JavaScript installation](/docu/client/js/installation.md)
  - [JavaScript usage](/docu/client/js/usage.md)

# Concept

The concept is a peer to peer packet messenger, with a server used to avoid direct connections.
Usage should be simple and generic, yet stable and secure with reasonably performance.

A Nooby server can be reused for multiple projects and handles common logic like login, session creation, game lobby
queries etc. It also offloads the broadcasting of data to a server with potential better
bandwidth.

Clients send packages, which consist of two parts: the header and the payload.
The header is meant for the server and specifies the type of packet and how to treat it. The payload is forwarded to the
other clients and can contain any type of data (including binary). It is recommended to also use MsgPack here.

Usually, messages do not confirm successful operations, but instead return errors otherwise.