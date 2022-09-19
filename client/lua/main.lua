--[[
Example application - chat software
--]]

--[[
require("testbench")
os.exit()
--]]

---[[
require("benchmark")
os.exit()
--]]

local inspect = require("inspect")

local log = { }
local input = ""

--connect to a local nooby server to the global "testChannel"
local nooby = require("nooby")("localhost", 25000, "testChannel")

--set tag "filter" to "test"
nooby:send({ m = "tag", tag = "filter", value = "test" })

love.graphics.setBackgroundColor(0.9, 0.9, 0.9)

function love.draw()
	local width, height = love.graphics.getDimensions()
	
	love.graphics.setColor(0, 0, 0)
	for i = 1, 20 do
		local s = log[#log + 1 - i]
		if s then
			love.graphics.print(s, 5, height - 50 - (i - 1) * 20)
		end
	end
	
	love.graphics.setColor(0, 0, 0)
	love.graphics.line(0, height - 30, width, height - 30)
	if #input == 0 then
		love.graphics.setColor(0, 0, 0, 0.5)
		love.graphics.print("input text" .. (love.timer.getTime() % 1 > 0.5 and "|" or ""), 5, height - 20)
	else
		love.graphics.print(input .. (love.timer.getTime() % 1 > 0.5 and "|" or ""), 5, height - 20)
	end
end

function love.update()
	local header, payload = nooby:receive()
	if header then
		table.insert(log, inspect(header, { newline = "" }) .. ", " .. inspect(payload, { newline = "" }))
	elseif header == false then
		table.insert(log, "[ERROR] " .. tostring(payload))
	end
end

function love.textinput(text)
	if string.byte(text) < 127 and #input < 256 then
		input = input .. text
	end
end

function love.keypressed(key)
	if key == "backspace" then
		input = input:sub(1, -2)
	elseif key == "return" then
		--send a message (default) to all users with given tags
		nooby:send({ tags = { filter = "test" } }, { data = input })
		input = ""
	end
end