local noobyA = require("nooby")("localhost", 25000, "benchmark")
local noobyB = require("nooby")("localhost", 25000, "benchmark")

--dump first package
noobyB:demand()

noobyB:send({ m = "tag", tag = "filterA", value = "testA" })
noobyB:send({ m = "tag", tag = "filterB", value = "testB" })

local testSizes = { }
for i = 1, 10 do
	table.insert(testSizes, 4 ^ i)
end

local timePerTest = 10

local function getTestBlock(n)
	local input = {}
	for i = 1, n do
		table.insert(input, string.char(math.random(0, 255)))
	end
	return table.concat(input)
end

local function poll()
	if love.event then
		love.event.pump()
		for name, a, b, c, d, e, f in love.event.poll() do
			if name == "quit" then
				if not love.quit or not love.quit() then
					return a or 0
				end
			end
			love.handlers[name](a, b, c, d, e, f)
		end
	end
end

--ping
print("| Payload | Mean | Std |")
print("|---|---|---|")
for _, chunkSize in ipairs(testSizes) do
	local input = getTestBlock(chunkSize)
	
	--clear any pending messages
	while noobyB:demand(0.25) do end
	
	local init = love.timer.getTime()
	
	local times = { }
	while love.timer.getTime() - init < timePerTest do
		local c = love.timer.getTime()
		noobyA:send({ t = { filterA = "testA", filterB = "testB" } }, input)
		if not noobyB:demand(1) then
			error("We are missing a packet")
		end
		table.insert(times, love.timer.getTime() - c)
	end
	
	local mean = 0
	for i, v in ipairs(times) do
		mean = mean + v
	end
	mean = mean / #times
	local variance = 0
	for i, v in ipairs(times) do
		variance = variance + (v - mean) ^ 2
	end
	variance = variance / #times
	print(string.format("| %d bytes | %.1f ms | %.1f ms |", chunkSize, mean * 1000, math.sqrt(variance) * 1000))
	io.flush()
end

local function test(packets, chunkSize, header)
	local input = getTestBlock(chunkSize)
	
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
	
	return love.timer.getTime() - c
end

local function printStats(packets, chunkSize, time)
	print(string.format("| %d bytes | %.1f | %.1f |", chunkSize, packets / time, packets * chunkSize / time / 1024 ^ 2))
	io.flush()
end

for _, header in ipairs({ false, true }) do
	print("| Payload | Packets/s | MB/s |")
	print("|---|---|---|")
	for _, chunkSize in ipairs(testSizes) do
		local packets = 1
		local time
		while true do
			time = test(packets, chunkSize, header)
			if time < timePerTest then
				packets = packets * 2
			else
				break
			end
		end
		printStats(packets, chunkSize, time)
	end
end