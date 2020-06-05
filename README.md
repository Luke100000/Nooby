# Nooby
Node.js multiplayer message server suitable for client to client applications

[![Project license](https://img.shields.io/github/license/Luke100000/Nooby?style=flat-square)](https://github.com/Luke100000/Nooby/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Luke100000/Nooby?style=flat-square&logo=github)](https://github.com/Luke100000/Nooby/stargazers)
[![Donate to this project using Paypal](https://img.shields.io/badge/paypal-donate-blue.svg?style=flat-square&logo=paypal)](https://paypal.me/pools/c/8pAvKwQbHm)

## Message format
### format of incomming message
`CLLL{json}DATA` (one possibility)

C is the packet format
- 0    `CLLL{json}DATA`
- 1    `CLLLUUUDATA (U is the user ID)`
- 2    `CLLLDATA`
- 3    `CLLL{json}`
- 4    `CIII` (Where I is an optional indicator, used to ping)
And L the length of the next packet, either JSON or DATA (user ID has fixed length and is exluded)
    

### user ID
integer, count up per socket connect, maxed to 3 bytes (256^3)

## usage Server

## usage Client
### synonym JSON:{cmd}
- c = connect
- m = msg

### commands
- connect to channel: `JSON:{"cmd":"connect"}` Host get random ChannelID
- connect to channel with name: `JSON:{"cmd":"connect", "channel":"channelname"}` Host connect to channel with name channelname
- send msg: `JSON:{"cmd":"msg"}DATA` Send message to everyone in the channel, excude you; you will get your data back, if you are not in a channel

### lua

### javascript