local noobyA = require("nooby")("localhost", 25000)
local noobyB = require("nooby")("localhost", 25000)

noobyA:connect("benchmark")
noobyB:connect("benchmark")

--dump first package
noobyB:demand()

noobyB:send({ m = "tag", tag = "filterA", value = "testA" })
noobyB:send({ m = "tag", tag = "filterB", value = "testB" })

local packer = require("messagePack")

local testSizes = {}
for i = 1, 8 do
	table.insert(testSizes, 4 ^ (i - 1))
end

local timePerTest = 10

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

--ping
print()
print("Testing Ping")
print("| Payload | Mean | Std |")
print("|---|---|---|")
for _, testSize in ipairs(testSizes) do
	local input = getTestBlock(testSize)
	local bytes = #packer.pack(input)

	--clear any pending messages
	while noobyB:demand(0.25) do end

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
	print(string.format("| %d bytes | %.2f ms | %.2f ms |", bytes, mean * 1000, math.sqrt(variance) * 1000))
	io.flush()
end

---Send and receive packets and return the time required to transfer all of them
---@param packets number
---@param payloadSize number The size of the payload in bytes
---@param header boolean Include a test header
---@return number
---@return number
local function getDelta(packets, payloadSize, header)
	local input = getTestBlock(payloadSize)
	local bytes = #packer.pack(input)

	local c = love.timer.getTime()
	local sent = 0
	local received = 0

	while sent < packets or received < packets do
		if sent < packets then
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

	return love.timer.getTime() - c, bytes
end

local function printStats(packets, payloadSize, time)
	print(string.format("| %d bytes | %.1f | %.1f |", payloadSize, packets / time, packets * payloadSize / time / 1024 ^ 2))
	io.flush()
end

for _, header in ipairs({ false, true }) do
	print()
	print("Testing Bandwidth " .. (header and "with header" or "without header"))
	print("| Payload | Packets/s | MB/s |")
	print("|---|---|---|")
	for _, testSize in ipairs(testSizes) do
		local packets = 1
		local time, bytes
		while true do
			time, bytes = getDelta(packets, testSize, header)
			if time < timePerTest then
				packets = packets * 2
			else
				break
			end
		end
		printStats(packets, bytes, time)
	end
end
