--[[
#worker thread
--]]

local dir, channel_send, channel_receive, server, port, settings = unpack({...})

require("love.thread")
require("love.data")
require("love.timer")

require(dir .. "/json")
require(dir .. "/saveTableBinary")

local socket = require("socket")
local sock

--wait a total of 10 seconds, with 20 attempts, to reconnect, until giving up
local reconnectSleep = 0.5
local reconnectAttempts = 20

--packets waiting to be sent
local jobs = { }

function packInt(i)
	return string.char(math.floor(i / 65536)) .. string.char(math.floor(i / 256) % 256) .. string.char(i % 256)
end

function unpackInt(str)
	return string.byte(str:sub(1, 1)) * 256 * 256 + string.byte(str:sub(2, 2)) * 256 + string.byte(str:sub(3, 3))
end

--pack a message
function packMsg(header, data)
	local data_data
	
	if true then
		data_data = data and data.data or "hi"
	else
		data_data = data and table.saveBinary(data) or ""
		
		--compress
		if #data_data > 128 then
			data_data = string.char(1) .. love.data.compress("string", "lz4", data_data, 1)
		else
			data_data = string.char(0) .. data_data
		end
	end
	
	--length of data segment
	header.l = #data_data
	
	--default command
	header.c = header.c or header.cmd or "m"
	header.cmd = nil
	
	--header segment
	local json_data = json.encode(header)
	
	--detemine type
	local typ = 0
	local length = #json_data
	
	--pack
	local packet = string.char(typ) .. packInt(length) .. json_data .. data_data
	
	--push to jobs
	jobs[#jobs+1] = {packet}
end

function connect()
	--try to connect
	local err
	sock, err = socket.connect(server,  port)
	
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
				channel_receive:pop("connection_lost")
				sock:close()
				return false
			end
			love.thread.sleep(reconnectSleep)
		end
	end
end

--reject this connection
if not connect() then
	channel_receive:push("connection_error")
	return
end

--work
local buffer = ""
local receiving = false
while true do
	local worked = false
	
	--receive send jobs
	local job = channel_send:pop()
	if job then
		if job == "disconnect" then
			channel_receive:pop("disconnected")
			sock:close()
			return
		else
			packMsg(job[1], job[2])
		end
	end
	
	--send as many messages as possible
	while jobs[1] do
		local j = jobs[1]
		
		--try to send
		local result, message, lastByte = sock:send(j[1], j[2])
		
		--not send, or only partially.
		if (result == nil) then
			--critical, connection lost, try to reconnect
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
	
	--receive msgs
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
		if receiving then
			if receiving[1] then
				--header
				if #buffer >= receiving.length then
					receiving.json = json.decode(buffer:sub(1, receiving.length))
					
					buffer = buffer:sub(receiving.length+1)
					
					receiving[1] = false
					receiving.length = receiving.json.l
				end
			elseif receiving[2] then
				--data
				if #buffer >= receiving.length then
					local dat = buffer:sub(1, receiving.length)
					
					if true then
						dat = {data = dat}
					else
						if dat:sub(1, 1) == string.char(0) then
							dat = table.loadBinary(dat:sub(2))
						else
							dat = table.loadBinary(love.data.decompress("string", "lz4", dat:sub(2)))
						end
					end
					
					buffer = buffer:sub(receiving.length+1)
					
					receiving.data = dat
					receiving[2] = false
				end
			else
				--done
				channel_receive:push({json = receiving.json, data = receiving.data})
				receiving = false
			end
		else
			if #buffer >= 4 then
				local typ = string.byte(buffer:sub(1, 1))
				
				if typ == 0 then
					receiving = {true, true}
				elseif typ == 1 then
					error("unsupported typ " .. typ)
				elseif typ == 2 then
					receiving = {false, true}
				elseif typ == 3 then
					receiving = {true, false}
				elseif typ == 4 then
					--ping
				elseif typ == 5 then
					error("unsupported typ " .. typ)
				else
					error("unsupported typ " .. typ)
				end
				
				if receiving then
					receiving.length = unpackInt(buffer:sub(2, 4))
					
					receiving.json = { }
					receiving.data = { }
				end
				
				buffer = buffer:sub(5)
				
				worked = true
			else
				break
			end
		end
	end
	
	--sleep
	if worked then
		love.timer.sleep(1/256)
	end
end