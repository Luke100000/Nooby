local dir, sendChannel, receiveChannel, server, port, settings = unpack({ ... })

--the byte used to indicate the type of compression
local compressionID = settings.compression == "lz4" and 1 or settings.compression == "zlib" and 2 or
	settings.compression == "gzip" and 3 or 0

require("love.thread")
require("love.data")
require("love.timer")

local buffer = require("string.buffer")

local packer = require(dir .. "/messagePack")

local socket

local char = string.char
local floor = math.floor

--automatically adjusted threshold
local compressionThreshold = 64

--packets waiting to be sent
local jobs = {}

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
			payload = char(compressionID) ..
				love.data.compress("string", settings.compression, payload, settings.compressionLevel)

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
	socket, err = require("socket").connect(server, port)

	--failed
	if not socket then
		return false
	end

	--settings
	socket:setoption("tcp-nodelay", true)
	socket:settimeout(0)

	--success
	return true
end

--reject this connection
if not connect() then
	receiveChannel:push("connection_error")
	return
end

--receiver channels
local buffers = {}
local statuses = {}
local function receive(user)
	--start new message
	if not statuses[user] and #buffers[user] >= 6 then
		local b1, b2, b3, b4, b5, b6 = buffers[user]:get(6):byte(1, 6)
		local headerSize = b1 * 256 + b2
		local payloadSize = b3 * 256 ^ 3 + b4 * 256 ^ 2 + b5 * 256 + b6

		statuses[user] = {
			headerSize = headerSize,
			payloadSize = payloadSize,
			header = { u = user, m = "message" },
			payload = {},
			state = headerSize > 0 and "header" or payloadSize > 0 and "payload" or "done"
		}
	end

	--header
	if statuses[user] and statuses[user].state == "header" and #buffers[user] >= statuses[user].headerSize then
		statuses[user].header = packer.unpack(buffers[user]:get(statuses[user].headerSize))
		statuses[user].header.m = statuses[user].header.m or "message"
		statuses[user].header.u = user

		if statuses[user].payloadSize == 0 then
			statuses[user].state = "done"
		else
			statuses[user].state = "payload"
		end
	end

	--payload
	if statuses[user] and statuses[user].state == "payload" and #buffers[user] >= statuses[user].payloadSize then
		local compressionByte, payload = buffers[user]:get(1, statuses[user].payloadSize)

		compressionByte = compressionByte:byte()

		--decompress
		if compressionByte == 0 then
			payload = packer.unpack(payload)
		elseif compressionByte == 1 then
			payload = packer.unpack(love.data.decompress("string", "lz4", payload))
		elseif compressionByte == 2 then
			payload = packer.unpack(love.data.decompress("string", "zlib", payload))
		elseif compressionByte == 3 then
			payload = packer.unpack(love.data.decompress("string", "gzip", payload))
		end


		statuses[user].payload = payload
		statuses[user].state = "done"
	end

	--done
	if statuses[user] and statuses[user].state == "done" then
		receiveChannel:push({ statuses[user].header, statuses[user].payload })
		statuses[user] = false
	end
end

--work and primary receive buffer
local receiveBuffer = buffer.new()
---@type boolean | table
local currentChunk = false
while true do
	local worked = false

	--receive send jobs
	local job = sendChannel:pop()
	if job then
		if job == "disconnect" then
			receiveChannel:push("disconnected")
			socket:close()
			return
		else
			packMessage(job[1], job[2])
		end
	end

	--send as many messages as possible
	while jobs[1] do
		local j = jobs[1]

		--try to send
		local result, message, lastByte = socket:send(j[1], j[2])

		--not send, or only partially.
		if (result == nil) then
			--connection lost
			if message == "closed" then
				receiveChannel:push("connection_lost")
				socket:close()
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
	local result, message, partial = socket:receive(1024 * 64)
	if result then
		receiveBuffer:put(result)
		worked = true
	else
		if message == "closed" then
			return
		elseif partial and #partial > 0 then
			receiveBuffer:put(partial)
			worked = true
		end
	end

	--receive chunks
	while true do
		if currentChunk then
			if #receiveBuffer >= currentChunk[2] then
				local chunk = receiveBuffer:get(currentChunk[2])
				if not buffers[currentChunk[1]] then
					buffers[currentChunk[1]] = buffer.new()
				end
				buffers[currentChunk[1]]:put(chunk)
				receive(currentChunk[1])
				currentChunk = false
				worked = true
			else
				break
			end
		else
			if #receiveBuffer >= 4 then
				local b1, b2, b3, b4 = receiveBuffer:get(4):byte(1, 4)
				local user = b1 * 256 + b2
				local length = b3 * 256 + b4 + 1
				currentChunk = { user, length }
				worked = true
			else
				break
			end
		end
	end

	--sleep
	if not worked then
		love.timer.sleep(1 / 10000)
	end
end
