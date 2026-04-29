local noobyA = require("nooby")("localhost", 25000)
local noobyB = require("nooby")("localhost", 25000)

local codec = "messagePack"
local hasStringBuffer, stringBuffer = pcall(require, "string.buffer")
if hasStringBuffer then
	codec = "string.buffer"
	noobyA:setEncoderDecoder(stringBuffer.encode, stringBuffer.decode)
	noobyB:setEncoderDecoder(stringBuffer.encode, stringBuffer.decode)
end

local channel = "benchmark_" .. math.floor(love.timer.getTime() * 1000000)
noobyA:connect(channel)
noobyB:connect(channel)

--dump first package
noobyB:demand()

noobyB:send({ m = "tag", tag = "filterA", value = "testA" })
noobyB:send({ m = "tag", tag = "filterB", value = "testB" })

local testSizes = {}
for i = 1, 6 do
	table.insert(testSizes, 4 ^ (i - 1))
end

local timePerTest = 0.5
local maxInFlight = 512
local compressionThreshold = 64
local compressionIds = {
	lz4 = 1,
	zlib = 2,
	gzip = 3,
}

local function getTestBlock(n)
	local input = {}

	local children = math.floor(n / 100)
	while n > 0 do
		n = n - 1 - children

		table.insert(input, {
			key = "value",
			health = math.random(),
			x = math.random(),
			y = math.random(),
			list = { math.random(100), math.random(100) },
			child = children > 1 and getTestBlock(children) or false
		})
	end
	return input
end

local function poll()
	if love.event then
		love.event.pump()
		for name, a, b, c, d, e, f in love.event.poll() do
			if name == "quit" then
				---@diagnostic disable-next-line: undefined-field
				if not love.quit or not love.quit() then
					return a or 0
				end
			end
			---@diagnostic disable-next-line: undefined-field
			love.handlers[name](a, b, c, d, e, f)
		end
	end
end

local function clearApiMessages()
	while noobyB:receive() do end
end

local function clearRawMessages()
	while noobyB.receiveChannel:pop() do end
end

local function getPayloadSizes(payload)
	local encoded = noobyA.encoder(payload)
	local compression = noobyA.settings.compression
	if #encoded >= compressionThreshold and compressionIds[compression] then
		local compressed = love.data.compress("string", compression, encoded, noobyA.settings.compressionLevel)
		return 1 + #compressed, #encoded
	end
	return 1 + #encoded, #encoded
end

local function getEncodedPayload(payload)
	return noobyA.encoder(payload)
end

--routed delivery
print()
print("Codec: " .. codec)
print()
print("Testing Routed Delivery (client API)")
print("| Logical Payload | Compressed Payload | Mean | Std |")
print("|---|---|---|---|")
for _, testSize in ipairs(testSizes) do
	local input = getTestBlock(testSize)
	local compressedBytes, logicalBytes = getPayloadSizes(input)

	--clear any pending messages
	clearApiMessages()

	local init = love.timer.getTime()

	local times = {}
	while love.timer.getTime() - init < timePerTest do
		local c = love.timer.getTime()
		noobyA:send({ t = { filterA = "testA", filterB = "testB" } }, input)
		if not noobyB:demand(1) then
			error("We are missing a packet")
		end
		table.insert(times, love.timer.getTime() - c)
	end

	local mean = 0
	for _, v in ipairs(times) do
		mean = mean + v
	end
	mean = mean / #times
	local variance = 0
	for _, v in ipairs(times) do
		variance = variance + (v - mean) ^ 2
	end
	variance = variance / #times
	print(string.format("| %d bytes | %d bytes | %.2f ms | %.2f ms |", logicalBytes, compressedBytes, mean * 1000, math.sqrt(variance) * 1000))
	io.flush()
end

print()
print("Testing Routed Delivery (pre-encoded)")
print("| Logical Payload | Compressed Payload | Mean | Std |")
print("|---|---|---|---|")
for _, testSize in ipairs(testSizes) do
	local input = getTestBlock(testSize)
	local compressedBytes, logicalBytes = getPayloadSizes(input)
	local encoded = getEncodedPayload(input)

	clearRawMessages()

	local init = love.timer.getTime()

	local times = {}
	while love.timer.getTime() - init < timePerTest do
		local c = love.timer.getTime()
		noobyA.sendChannel:push({ { t = { filterA = "testA", filterB = "testB" } }, encoded })
		if not noobyB.receiveChannel:demand(1) then
			error("We are missing a packet")
		end
		table.insert(times, love.timer.getTime() - c)
	end

	local mean = 0
	for _, v in ipairs(times) do
		mean = mean + v
	end
	mean = mean / #times
	local variance = 0
	for _, v in ipairs(times) do
		variance = variance + (v - mean) ^ 2
	end
	variance = variance / #times
	print(string.format("| %d bytes | %d bytes | %.2f ms | %.2f ms |", logicalBytes, compressedBytes, mean * 1000, math.sqrt(variance) * 1000))
	io.flush()
end

---Send and receive packets and return the time required to transfer all of them
---@param packets number
---@param payloadSize number Test block size scale
---@param header boolean Include a test header
---@return number
---@return number
---@return number
local function getDelta(packets, payloadSize, header)
	local input = getTestBlock(payloadSize)
	local compressedBytes, logicalBytes = getPayloadSizes(input)

	local c = love.timer.getTime()
	local sent = 0
	local received = 0

	while sent < packets or received < packets do
		if sent < packets and sent - received < maxInFlight then
			if header then
				noobyA:send({ t = { filterA = "testA", filterB = "testB" } }, input)
			else
				noobyA:send(false, input)
			end
			sent = sent + 1
		end

		if received < packets then
			local header, payload = noobyB:receive()
			if header then
				received = received + 1
			elseif header == false then
				error(payload)
			end
		end

		poll()
	end

	return love.timer.getTime() - c, logicalBytes, compressedBytes
end

---@param packets number
---@param payloadSize number Test block size scale
---@param header boolean Include a test header
---@return number
---@return number
---@return number
local function getRawDelta(packets, payloadSize, header)
	local input = getTestBlock(payloadSize)
	local compressedBytes, logicalBytes = getPayloadSizes(input)
	local encoded = getEncodedPayload(input)

	local c = love.timer.getTime()
	local sent = 0
	local received = 0

	while sent < packets or received < packets do
		if sent < packets and sent - received < maxInFlight then
			if header then
				noobyA.sendChannel:push({ { t = { filterA = "testA", filterB = "testB" } }, encoded })
			else
				noobyA.sendChannel:push({ false, encoded })
			end
			sent = sent + 1
		end

		if received < packets then
			local msg = noobyB.receiveChannel:pop()
			if msg then
				received = received + 1
			end
		end

		poll()
	end

	return love.timer.getTime() - c, logicalBytes, compressedBytes
end

local function printStats(packets, logicalBytes, compressedBytes, time)
	print(string.format("| %d bytes | %d bytes | %.1f | %.1f | %.1f |", logicalBytes, compressedBytes, packets / time, packets * logicalBytes / time / 1024 ^ 2, packets * compressedBytes / time / 1024 ^ 2))
	io.flush()
end

local function runBandwidth(title, fn)
	for _, header in ipairs({ false, true }) do
		print()
		print(title .. " " .. (header and "with header" or "without header"))
		print("| Logical Payload | Compressed Payload | Packets/s | Logical MB/s | Compressed MB/s |")
		print("|---|---|---|---|---|")
		for _, testSize in ipairs(testSizes) do
			local packets = 1
			local time, logicalBytes, compressedBytes
			while true do
				time, logicalBytes, compressedBytes = fn(packets, testSize, header)
				if time < timePerTest then
					packets = packets * 2
				else
					break
				end
			end
			printStats(packets, logicalBytes, compressedBytes, time)
		end
	end
end

runBandwidth("Testing Client API Bandwidth", getDelta)
runBandwidth("Testing Pre-encoded Transport Bandwidth", getRawDelta)

--Close worker threads after the benchmark has printed all results.
noobyA:disconnect()
noobyB:disconnect()
love.event.quit()
