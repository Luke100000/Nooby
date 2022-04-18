--[[
Example application - chat software
--]]

local inspect = require("inspect")

--local nooby = require("nooby")("katzmair.eu", 25000, "testChannel", "lz4", -1)
local nooby = require("nooby")("localhost", 25000, "testChannel", "lz4", -1)

log = { }

input = ""

nooby:send({ c = "tag", tag = "test", value = "hallo" })

love.graphics.setBackgroundColor(0.9, 0.9, 0.9)

function love.draw()
    love.graphics.setColor(0, 0, 0)
    for i = 1, 20 do
        local s = log[#log + 1 - i]
        if s then
            love.graphics.print(s, 5, love.graphics.getHeight() - 50 - (i - 1) * 20)
        end
    end

    love.graphics.setColor(0, 0, 0)
    love.graphics.line(0, love.graphics.getHeight() - 30, love.graphics.getWidth(), love.graphics.getHeight() - 30)
    if #input == 0 then
        love.graphics.setColor(0, 0, 0, 0.5)
        love.graphics.print("input text" .. (love.timer.getTime() % 1 > 0.5 and "|" or ""), 5, love.graphics.getHeight() - 20)
    else
        love.graphics.print(input .. (love.timer.getTime() % 1 > 0.5 and "|" or ""), 5, love.graphics.getHeight() - 20)
    end
end

function love.update()
    local msg, err = nooby:receive()
    if msg then
        log[#log + 1] = inspect(msg.header, { newline = "" }) .. ", " .. inspect(msg.data, { newline = "" })
    elseif msg == false then
        log[#log + 1] = "[ERROR] " .. tostring(err)
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
        nooby:send({ c = "m", tags = { test = "hallo" } }, { data = input })
        input = ""
    end
end