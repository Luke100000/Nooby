# Nooby
Node.js multiplayer message server suitable for client to client applications

## Message format
### format of incomming message
CLLL{json}DATA
Where
C is the packet format
    0    CLLL{json}DATA
    1    CLLLUUUDATA (U is the user ID)
    2    CLLLDATA
    3    CLLL{json}
    4    CIII (Where I is an optional indicator, used to ping)
And L the length of the next packet, either JSON or DATA (user ID has fixed length and is exluded)
    

### user ID
integer, count up per socket connect, maxed to 3 bytes (256^3)

## usage Server

## usage Client

### lua

### javascript