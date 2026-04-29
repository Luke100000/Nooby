# Packet Format

This page describes the binary format used between clients and the Nooby server. It is mainly relevant when implementing a custom client.

All integer fields are unsigned and big-endian.

## Message layout

A Nooby message has a short framing header, an optional MessagePack header, and an optional payload:

```text
{headerLength}{payloadLength}{header}{payload}
```

| Field | Size | Meaning |
| --- | ---: | --- |
| `headerLength` | 2 bytes | Number of bytes in `header`. |
| `payloadLength` | 4 bytes | Number of bytes in `payload`. |
| `header` | variable | MessagePack object used by server modules. Omitted when `headerLength` is `0`. |
| `payload` | variable | Application-defined bytes. Omitted when `payloadLength` is `0`. |

If `headerLength` is `0`, the message is treated as a default `message` packet.

## Server to client

Server-to-client data is chunked. This allows large payloads to stream while messages from different users interleave.

```text
{userId}{chunkSize}{chunk}
```

| Field | Size | Meaning |
| --- | ---: | --- |
| `userId` | 2 bytes | Sender ID within the channel. |
| `chunkSize` | 2 bytes | Encoded chunk size. Read `chunkSize + 1` bytes for the actual chunk. |
| `chunk` | variable | Raw bytes from that sender's message stream. |

Important details:

- The server stores `chunk.length - 1` in `chunkSize`.
- The maximum chunk length is `65,536` bytes.
- Keep one receive buffer per `userId`; chunks from different users may interleave.
- Remove a user's receive buffer when that user disconnects. User IDs may be reused after disconnect.
- After appending a chunk to a user's buffer, parse complete messages using the [message layout](#message-layout).

## Client to server

Client-to-server data is not chunked because packets from a single client do not interleave. Send one complete message at a time:

```text
{headerLength}{payloadLength}{header}{payload}
```

Use the same [message layout](#message-layout) as above.

## Payload format

The server does not inspect payload contents. The bundled clients use a leading compression byte followed by MessagePack payload data:

```text
{compression}{messagePackPayload}
```

| Byte | Compression |
| ---: | --- |
| `0` | uncompressed |
| `1` | LZ4 |
| `2` | zlib |
| `3` | gzip |

This convention is recommended for compatibility with existing clients, but custom clients may define their own payload format when all peers understand it.
