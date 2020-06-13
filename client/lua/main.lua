local nooby = require("nooby")("localhost", "25000")
--local nooby = require("nooby")("katzmair.eu", "25000", "testChannel")

require("json")

nooby:send({c = "tag", tag = "test", tagValue = "hallo"}, {data = key})

log = ""

function love.draw()
	love.graphics.print(log, 5, 5)
end

function love.update()
	local msg = nooby:receive()
	if msg then
		log = log .. json.encode(msg.json) .. "\n" .. json.encode(msg.data) .. "\n\n"
	end
end

function love.keypressed(key)
	nooby:send({}, {data = key})
	nooby:send({tag = "test", tagValue = "hallo"}, {data = key})
	nooby:send({tags = {["test"] = "hallo"}}, {data = key})
end