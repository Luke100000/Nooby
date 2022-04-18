local dir, sendChannel, receiveChannel, server, port, settings = unpack({ ... })

local compressionID = settings.compression == "lz4" and 1 or settings.compression == "zlib" and 2 or 0

require("love.thread")
require("love.data")
require("love.timer")

local packer = require(dir .. "/MessagePack")

local socket = require("socket")
local sock

--wait a total of 10 seconds, with 20 attempts, to reconnect, until giving up
local reconnectSleep = 0.5
local reconnectAttempts = 20

local char = string.char
local floor = math.floor

--automatically adjusted threshold
local compressionThreshold = 64

--packets waiting to be sent
local jobs = { }

function packInt(i)
    return char(floor(i / 65536), floor(i / 256) % 256, i % 256)
end

--pack a message
function packMsg(header, data)
    --pack
    local data_data = data and packer.pack(data)

    --compress
    if data_data then
        local rawLength = #data_data
        if rawLength > compressionThreshold and compressionID > 0 then
            data_data = char(compressionID) .. love.data.compress("string", settings.compression, data_data, settings.compressionLevel)

            --auto adjust threshold
            if #data_data > rawLength then
                compressionThreshold = compressionThreshold + 1
            else
                compressionThreshold = compressionThreshold - 0.1
            end
        else
            data_data = char(0) .. data_data
        end

        --length of data segment
        header.l = #data_data
    end

    --header segment
    local header_data = packer.pack(header)

    --pack
    local packet
    if data_data then
        packet = packInt(#header_data) .. header_data .. data_data
    else
        packet = packInt(#header_data) .. header_data
    end

    --push to jobs
    table.insert(jobs, { packet })
end

function connect()
    --try to connect
    local err
    sock, err = socket.connect(server, port)

    --failed
    if not sock then
        return false
    end

    --settings
    sock:setoption("tcp-nodelay", true)
    sock:settimeout(0)

    jobs = { }
    packMsg({
        c = "connect",
        channel = settings.channel,
        session = settings.session,
    })

    --success
    return true
end

function reconnect()
    for attempt = 1, reconnectAttempts do
        if connect() then
            --reconnected
            return true
        else
            if attempt == reconnectAttempts then
                receiveChannel:push("connection_lost")
                sock:close()
                return false
            end
            love.timer.sleep(reconnectSleep)
        end
    end
end

--reject this connection
if not connect() then
    receiveChannel:push("connection_error")
    return
end

--work
local buffer = ""
local receiving = false
while true do
    local worked = false

    --receive send jobs
    local job = sendChannel:pop()
    if job then
        if job == "disconnect" then
            receiveChannel:push("disconnected")
            sock:close()
            return
        else
            packMsg(job[1] or {}, job[2])
        end
    end

    --send as many messages as possible
    while jobs[1] do
        local j = jobs[1]

        --try to send
        local result, message, lastByte = sock:send(j[1], j[2])

        --not send, or only partially.
        if (result == nil) then
            --connection lost, try to reconnect
            if message == "closed" then
                if not reconnect() then
                    return
                end
                j[2] = nil
            else
                j[2] = lastByte
            end

            break
        end

        worked = true
        table.remove(jobs, 1)
    end

    --receive messages
    local result, message, partial = sock:receive(1024 * 64)
    if result then
        buffer = buffer .. result
        worked = true
    else
        if message == "closed" then
            if not reconnect() then
                return
            end
            buffer = ""
        elseif partial then
            buffer = buffer .. partial
        end
        worked = true
    end

    --parse
    while true do
        io.flush()
        if receiving then
            if receiving.awaitingHeader then
                --header
                if #buffer >= receiving.length then
                    receiving.header = packer.unpack(buffer:sub(1, receiving.length)) or {}
                    receiving.header.c = receiving.header.c or "m"

                    buffer = buffer:sub(receiving.length + 1)

                    receiving.awaitingHeader = false
                    receiving.length = receiving.header.l or 0

                    if receiving.length == 0 then
                        receiving.awaitingData = false
                    end
                end
            elseif receiving.awaitingData then
                --data
                if #buffer >= receiving.length then
                    local dataSegment = buffer:sub(1, receiving.length)

                    local compressionByte = dataSegment:byte(1, 1)
                    if compressionByte == 0 then
                        dataSegment = packer.unpack(dataSegment:sub(2))
                    elseif compressionByte == 1 then
                        dataSegment = packer.unpack(love.data.decompress("string", "lz4", dataSegment:sub(2)))
                    else
                        dataSegment = packer.unpack(love.data.decompress("string", "zlib", dataSegment:sub(2)))
                    end

                    buffer = buffer:sub(receiving.length + 1)

                    receiving.data = dataSegment
                    receiving.awaitingData = false
                end
            else
                --done
                receiveChannel:push({ header = receiving.header, data = receiving.data })
                receiving = false
            end
        else
            if #buffer >= 3 then
                receiving = {
                    awaitingHeader = true,
                    awaitingData = true,
                    length = buffer:byte(1) * 65536 + buffer:byte(2) * 256 + buffer:byte(3)
                }

                buffer = buffer:sub(4)

                worked = true
            else
                break
            end
        end
    end

    --sleep
    if not worked then
        love.timer.sleep(1 / 256)
    end
end