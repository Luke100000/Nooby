local dir, sendChannel, receiveChannel, server, port, settings = unpack({ ... })

local compressionID = settings.compression == "lz4" and 1 or settings.compression == "zlib" and 2 or 0

require("love.thread")
require("love.data")
require("love.timer")

local packer = require(dir .. "/messagePack")

local socket = require("socket")
local sock

local char = string.char
local floor = math.floor

--automatically adjusted threshold
local compressionThreshold = 64

--packets waiting to be sent
local jobs = { }

local function packShort(i)
	return char(floor(i / 256), i % 256)
end
local function packInteger(i)
	return char(floor(i / 256 ^ 3), floor(i / 256 ^ 2) % 256, floor(i / 256) % 256, i % 256)
end

local ZERO_INTEGER = char(0, 0, 0, 0)
local ZERO_SHORT = char(0, 0)

--pack a message
local function packMessage(header, payload)
	if payload then
		--pack
		payload = packer.pack(payload)
		
		--compress
		local rawLength = #payload
		if rawLength > compressionThreshold and compressionID > 0 then
			payload = char(compressionID) .. love.data.compress("string", settings.compression, payload, settings.compressionLevel)
			
			--auto adjust threshold
			if #payload > rawLength then
				compressionThreshold = compressionThreshold + 1
			else
				compressionThreshold = compressionThreshold - 0.1
			end
		else
			payload = char(0) .. payload
		end
	end
	
	--header segment
	local packedHeader = header and packer.pack(header)
	
	--pack
	local packet
	if payload and packedHeader then
		packet = packShort(#packedHeader) .. packInteger(#payload) .. packedHeader .. payload
	elseif payload then
		packet = ZERO_SHORT .. packInteger(#payload) .. payload
	elseif packedHeader then
		packet = packShort(#packedHeader) .. ZERO_INTEGER .. packedHeader
	else
		packet = ZERO_SHORT .. ZERO_INTEGER
	end
	
	--push to jobs
	table.insert(jobs, { packet })
end

local function connect()
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
	packMessage({
		m = "connect",
		channel = settings.channel,
		settings = settings.channel,
	})
	
	--success
	return true
end

--reject this connection
if not connect() then
	receiveChannel:push("connection_error")
	return
end

--receiver channels
local buffers = { }
local statuses = { }
local function receive(user)
	--start new message
	if not statuses[user] and #buffers[user] >= 6 then
		local b1, b2, b3, b4, b5, b6 = buffers[user]:byte(1, 6)
		local headerSize = b1 * 256 + b2
		local payloadSize = b3 * 256 ^ 3 + b4 * 256 ^ 2 + b5 * 256 + b6
		
		statuses[user] = {
			headerSize = headerSize,
			payloadSize = payloadSize,
			header = { u = user, m = "message" },
			payload = { },
			state = headerSize > 0 and "header" or payloadSize > 0 and "payload" or "done"
		}
		
		buffers[user] = buffers[user]:sub(7)
	end
	
	--header
	if statuses[user] and statuses[user].state == "header" and #buffers[user] >= statuses[user].headerSize then
		statuses[user].header = packer.unpack(buffers[user]:sub(1, statuses[user].headerSize))
		statuses[user].header.m = statuses[user].header.m or "message"
		statuses[user].header.u = user
		
		buffers[user] = buffers[user]:sub(statuses[user].headerSize + 1)
		
		if statuses[user].payloadSize == 0 then
			statuses[user].state = "done"
		else
			statuses[user].state = "payload"
		end
	end
	
	--payload
	if statuses[user] and statuses[user].state == "payload" and #buffers[user] >= statuses[user].payloadSize then
		local payload = buffers[user]:sub(1, statuses[user].payloadSize)
		
		--decompress
		local compressionByte = payload:byte(1, 1)
		if compressionByte == 0 then
			payload = packer.unpack(payload:sub(2))
		elseif compressionByte == 1 then
			payload = packer.unpack(love.data.decompress("string", "lz4", payload:sub(2)))
		else
			payload = packer.unpack(love.data.decompress("string", "zlib", payload:sub(2)))
		end
		
		buffers[user] = buffers[user]:sub(statuses[user].payloadSize + 1)
		
		statuses[user].payload = payload
		statuses[user].state = "done"
	end
	
	--done
	if statuses[user] and statuses[user].state == "done" then
		receiveChannel:push({ statuses[user].header, statuses[user].payload })
		statuses[user] = false
	end
end

--work
local buffer = ""
local currentChunk = false
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
			packMessage(job[1], job[2])
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
				receiveChannel:push("connection_lost")
				sock:close()
				return
			else
				j[2] = lastByte + 1
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
			return
		elseif partial and #partial > 0 then
			buffer = buffer .. partial
			worked = true
		end
	end
	
	--receive chunks
	while true do
		if currentChunk then
			if #buffer >= currentChunk[2] then
				buffers[currentChunk[1]] = (buffers[currentChunk[1]] or "") .. buffer:sub(1, currentChunk[2])
				buffer = buffer:sub(currentChunk[2] + 1)
				receive(currentChunk[1])
				currentChunk = nil
				worked = true
			else
				break
			end
		else
			if #buffer >= 4 then
				local b1, b2, b3, b4 = buffer:byte(1, 4)
				local user = b1 * 256 + b2
				local length = b3 * 256 + b4 + 1
				currentChunk = { user, length }
				buffer = buffer:sub(5)
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