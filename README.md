# Nooby

Extendable Node.js messaging server designed for easy client to client applications.

Communication uses [MessagePack](https://msgpack.org/index.html) and TCP, WebSocket and a simple packet format and
therefore works for a wide variety of
clients.

Client implementations provided for Lua. JavaScript is WIP.

An example chat software, benchmarks and test bench is provided for Lua. JavaScript is WIP.

[![Project license](https://img.shields.io/github/license/Luke100000/Nooby?style=flat-square)](https://github.com/Luke100000/Nooby/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Luke100000/Nooby?style=flat-square&logo=github)](https://github.com/Luke100000/Nooby/stargazers)

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

# Concept

The concept is a peer to peer packet messenger, with a server used to avoid direct connections.
Usage should be simple and generic, yet stable and secure with reasonably [performance](/docu/server/benchmark.md).

A Nooby server can be reused for multiple projects and handles common logic like login, session creation, game lobby
queries etc. It also offloads the broadcasting of data to a server with potential better
bandwidth.

Clients send packages, which consist of two parts: the header and the payload.
The header is meant for the server and specifies the type of packet and how to treat it. The payload is forwarded to the
other clients and can contain any type of data (including binary). It is recommended to also use MsgPack here.

Usually, messages do not confirm successful operations, but instead return errors otherwise.

# Responses

Client only response.

## `error`

* `reason` the reason for the error
    * e.g. `permission denied`
* `header` the header responsible for the error

## `shutdown`

Server has been shut down.

# Permissions

Some modules require a permission level. Having the `admin` tag grants level 2, being on a public server grants level 1,
everyone else has level 0.
