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

Tests were performed on random binary data as payloads with different sizes.

```
Ping
| Payload | Mean | Std |
|---|---|---|
| 64 bytes | 0.09 ms | 0.03 ms |
| 256 bytes | 0.09 ms | 0.03 ms |
| 1024 bytes | 0.10 ms | 0.03 ms |
| 4096 bytes | 0.10 ms | 0.14 ms |
| 16384 bytes | 0.12 ms | 0.03 ms |
| 65536 bytes | 0.18 ms | 0.04 ms |

Bandwidth
| Payload | Packets/s | MB/s |
|---|---|---|
| 64 bytes | 69659.2 | 4.3 |
| 256 bytes | 70826.2 | 17.3 |
| 1024 bytes | 66194.6 | 64.6 |
| 4096 bytes | 60499.3 | 236.3 |
| 16384 bytes | 42248.9 | 660.1 |
| 65536 bytes | 18240.6 | 1140.0 |
```

The same experiments but with artificial nested lua table data.

```
Testing Ping
| Payload | Mean | Std |
|---|---|---|
| 65 bytes | 0.09 ms | 0.03 ms |
| 257 bytes | 0.10 ms | 0.03 ms |
| 1027 bytes | 0.09 ms | 0.03 ms |
| 4099 bytes | 0.11 ms | 0.03 ms |
| 16515 bytes | 0.20 ms | 0.04 ms |
| 66179 bytes | 0.43 ms | 0.05 ms |
| 262603 bytes | 1.69 ms | 0.13 ms |
| 531403 bytes | 2.65 ms | 0.40 ms |

Bandwidth
| Payload | Packets/s | MB/s |
|---|---|---|
| 65 bytes | 74040.0 | 4.6 |
| 257 bytes | 69674.8 | 17.1 |
| 1027 bytes | 64570.4 | 63.2 |
| 4099 bytes | 43174.0 | 168.8 |
| 16515 bytes | 12419.2 | 195.6 |
| 66179 bytes | 3081.4 | 194.5 |
| 262603 bytes | 874.6 | 219.0 |
| 531403 bytes | 500.9 | 253.8 |
```
