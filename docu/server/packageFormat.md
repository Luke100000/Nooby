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


# server/packageFormat

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
