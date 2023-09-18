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

# Benchmark

The Lua Client has been benchmarked locally on a Ryzen 5600X, default settings, as defined by `/client/lua/benchmark.lua`

Tests were performed on random binary data as payloads with different sizes, with and without header.

```

Testing Ping
| Payload | Mean | Std |
|---|---|---|
| 4 bytes | 0.09 ms | 0.03 ms |
| 16 bytes | 0.09 ms | 0.03 ms |
| 64 bytes | 0.09 ms | 0.03 ms |
| 256 bytes | 0.09 ms | 0.03 ms |
| 1024 bytes | 0.10 ms | 0.03 ms |
| 4096 bytes | 0.10 ms | 0.14 ms |
| 16384 bytes | 0.12 ms | 0.03 ms |
| 65536 bytes | 0.18 ms | 0.04 ms |

Testing Bandwidth without header
| Payload | Packets/s | MB/s |
|---|---|---|
| 4 bytes | 89658.8 | 0.3 |
| 16 bytes | 89083.3 | 1.4 |
| 64 bytes | 85291.5 | 5.2 |
| 256 bytes | 83281.9 | 20.3 |
| 1024 bytes | 76878.0 | 75.1 |
| 4096 bytes | 66601.3 | 260.2 |
| 16384 bytes | 46432.1 | 725.5 |
| 65536 bytes | 19709.9 | 1231.9 |

Testing Bandwidth with header
| Payload | Packets/s | MB/s |
|---|---|---|
| 4 bytes | 70799.9 | 0.3 |
| 16 bytes | 70879.9 | 1.1 |
| 64 bytes | 69659.2 | 4.3 |
| 256 bytes | 70826.2 | 17.3 |
| 1024 bytes | 66194.6 | 64.6 |
| 4096 bytes | 60499.3 | 236.3 |
| 16384 bytes | 42248.9 | 660.1 |
| 65536 bytes | 18240.6 | 1140.0 |

```

Without payload encoding around 70k packets per seconds can be transmitted, or over a GB/s with sufficient large packets.
