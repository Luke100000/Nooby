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

# Packet Format

This section is only relevant when writing an own client and describes the binary representation of a packet.

Data is transmitted from _server to client_ in chunks, no bigger than `256^2` bytes:

- `{userId}{chunkSize}{chunk}`
  Messages from different users may interleave, therefore every user needs to concat chunks in its own buffer.

When data is sent from _client to server_, no chunking is performed as packets will never interleave.

One or more chunks may form a message:

- `{headerLength}{payloadLength}{header}{payload}`

`headerLength` 2 byte length of the header data  
`payloadLength` 4 bytes length of the payload  
`header` is a MessagePacked header containing module related data
`payload` is the payload, its length is specified in the header and usage is completely up to the client

It is common, but not required, that the payload starts with a leading byte defining its compression state:

- `0` uncompressed
- `1` LZ4
- `2` zlib
- `3` gzip
  The actual payload is also a MessagePack object
