--[[
#packTable.lua
by Luke100000
version 1.0

encodes lua tables
supports numbers, strings and boolean as index or value
supports nested tables
supported arrays
minimal structure size
minimal content size using char, short, integer and doubles
fast en and decoding

#format
4 bit	type
4 bit	index type

type
0	byte			8 bit unsigned
1	short			16 bit signed
2	integer			32 bit signed
3	double			64 bit lua double
4	string byte		8 bit length + n bytes string
5	string short	16 bit length + n bytes string
6	string			32 bit length + n bytes string
7	true			no data
8	false			no data
9	nil				no data
10
11
12
13	array			followed by data without key (index type always 0)
14	table			followed by data with key
15	return			done with this table, return
--]]

local string_char = string.char
local string_byte = string.byte

local type = type
local tostring = tostring
local floor = math.floor
local abs = math.abs
local rshift = bit.rshift
local pack = love.data.pack
local unpack = love.data.unpack

--provided by kikito at stackoverflow
local function isArray(t)
	local i = 0
	for _ in pairs(t) do
		i = i + 1
		if t[i] == nil then
			return false
		end
	end
	return true
end

local function pack(t, buffer, buffLen, isArr)
	if isArr then
		for d,s in ipairs(t) do
			local typ = type(s)
			if typ == "number" then
				buffLen = buffLen + 1
				local l = abs(s)
				if floor(s) == s and l < 2147483648 then
					if s >= 0 and s < 256 then
						--char
						buffer[buffLen] = string_char(0, s)
					elseif l <= 32767 then
						--short
						s = s + 32768
						buffer[buffLen] = string_char(1, floor(s / 256), s % 256)
					else
						--lua integer
						s = s + 2147483648
						buffer[buffLen] = string_char(2, floor(s / 16777216), floor(s / 65536) % 256, floor(s / 256) % 256, s % 256)
					end
				else
					--lua number
					buffer[buffLen] = string_char(3) .. pack("string", "n", s)
				end
			elseif typ == "string" then
				buffLen = buffLen + 1
				local length = #s
				if length < 256 then
					buffer[buffLen] = string_char(4) .. string_char(length) .. s
				elseif length < 65536 then
					buffer[buffLen] = string_char(5) .. string_char(floor(length / 256), length % 256) .. s
				else
					buffer[buffLen] = string_char(6) .. string_char(floor(length / 16777216), floor(length / 65536) % 256, floor(length / 256) % 256, length % 256) .. s
				end
			elseif typ == "boolean" then
				buffLen = buffLen + 1
				local boolType = s == true and 7 or s == false and 8 or 9
				buffer[buffLen] = string_char(boolType)
			elseif typ == "table" then
				--array or table
				local isArr = isArray(s)
				buffLen = buffLen + 1
				buffer[buffLen] = string_char(isArr and 13 or 14)
				
				buffLen = pack(s, buffer, buffLen, isArr)
				
				--return
				buffLen = buffLen + 1
				buffer[buffLen] = string_char(15)
			end
		end
	else
		for d,s in pairs(t) do
			--index
			local typIndex, index
			local typ = type(d)
			if typ == "number" then
				local l = abs(d)
				if floor(d) == d and l < 2147483648 then
					if d >= 0 and d < 256 then
						--char
						index = string_char(d)
						typIndex = 0
					elseif l <= 32767 then
						--short
						d = d + 32768
						index = string_char(floor(d / 256), d % 256)
						typIndex = 1
					else
						--lua integer
						d = d + 2147483648
						index = string_char(floor(d / 16777216), floor(d / 65536) % 256, floor(d / 256) % 256, d % 256)
						typIndex = 2
					end
				else
					--lua number
					index = pack("string", "n", d)
					typIndex = 3
				end
			elseif typ == "string" then
				local length = #d
				if length < 256 then
					index = string_char(length) .. d
					typIndex = 4
				elseif length < 65536 then
					index = string_char(floor(length / 256), length % 256) .. d
					typIndex = 5
				else
					index = string_char(floor(length / 16777216), floor(length / 65536) % 256, floor(length / 256) % 256, length % 256) .. d
					typIndex = 6
				end
			elseif typ == "boolean" then
				index = ""
				typIndex = d == true and 7 or d == false and 8 or 9
			end
			
			--value (and index combined)
			typ = type(s)
			if typ == "number" then
				buffLen = buffLen + 1
				local l = abs(s)
				if floor(s) == s and l < 2147483648 then
					if s >= 0 and s < 256 then
						--char
						buffer[buffLen] = string_char(0 + typIndex * 16) .. index .. string_char(s)
					elseif l <= 32767 then
						--short
						s = s + 32768
						buffer[buffLen] = string_char(1 + typIndex * 16) .. index .. string_char(floor(s / 256), s % 256)
					else
						--lua integer
						s = s + 2147483648
						buffer[buffLen] = string_char(2 + typIndex * 16) .. index .. string_char(floor(s / 16777216), floor(s / 65536) % 256, floor(s / 256) % 256, s % 256)
					end
				else
					--lua number
					buffer[buffLen] = string_char(3 + typIndex * 16) .. index .. pack("string", "n", s)
				end
			elseif typ == "string" then
				buffLen = buffLen + 1
				local length = #s
				if length < 256 then
					buffer[buffLen] = string_char(4 + typIndex * 16) .. index .. string_char(length) .. s
				elseif length < 65536 then
					buffer[buffLen] = string_char(5 + typIndex * 16) .. index .. string_char(floor(length / 256), length % 256) .. s
				else
					buffer[buffLen] = string_char(6 + typIndex * 16) .. index .. string_char(floor(length / 16777216), floor(length / 65536) % 256, floor(length / 256) % 256, length % 256) .. s
				end
			elseif typ == "boolean" then
				local boolType = s == true and 7 or s == false and 8 or 9
				buffLen = buffLen + 1
				buffer[buffLen] = string_char(boolType + typIndex * 16) .. index
			elseif typ == "table" then
				--array or table
				local isArr = isArray(s)
				buffLen = buffLen + 1
				buffer[buffLen] = string_char((isArr and 13 or 14) + typIndex * 16) .. index
				
				buffLen = pack(s, buffer, buffLen, isArr)
				
				--return
				buffLen = buffLen + 1
				buffer[buffLen] = string_char(15)
			end
		end
	end
	return buffLen
end

local function packMain(t)
	local isArr = isArray(t)
	local concatBuffer = {string_char(isArr and 13 or 14)}
	pack(t, concatBuffer, 1, isArr)
	return table.concat(concatBuffer)
end

local function unpack(i, currentData, isArr)
	local t = { }
	
	--table
	while true do
		local raw = currentData:byte(i)
		i = i + 1
		
		--EOF
		if not raw or raw == 15 then
			return t, i
		end
		
		--type
		local typ = raw % 16
		
		--index
		local index
		if isArr then
			index = #t + 1
		else
			local indexTyp = floor(raw / 16)
			if indexTyp == 0 then
				index = currentData:byte(i)
				i = i + 1
			elseif indexTyp == 1 then
				local a, b = currentData:byte(i, i+1)
				index = a * 256 + b - 32768
				i = i + 2
			elseif indexTyp == 2 then
				local a, b, c, d = currentData:byte(i, i+3)
				index = a * 16777216 + b * 65536 + c * 256 + d - 2147483648
				i = i + 4
			elseif indexTyp == 3 then
				index = unpack("n", currentData, i)
				i = i + 8
			elseif indexTyp == 4 then
				local length = currentData:byte(i)
				index = currentData:sub(i+1, i+length)
				i = i + 1 + length
			elseif indexTyp == 5 then
				local a, b = currentData:byte(i, i+1)
				local length = a * 256 + b
				index = currentData:sub(i+2, i+1+length)
				i = i + 2 + length
			elseif indexTyp == 6 then
				local a, b, c, d = currentData:byte(i, i+3)
				local length = a * 16777216 + b * 65536 + c * 256 + d
				index = currentData:sub(i+4, i+3+length)
				i = i + 4 + length
			elseif indexTyp == 7 then
				index = true
			elseif indexTyp == 8 then
				index = false
			else
				error(indexTyp .. "  ".. i)
			end
		end
		
		--value
		if typ == 0 then
			t[index] = currentData:byte(i)
			i = i + 1
		elseif typ == 1 then
			local a, b = currentData:byte(i, i+1)
			t[index] = a * 256 + b - 32768
			i = i + 2
		elseif typ == 2 then
			local a, b, c, d = currentData:byte(i, i+3)
			t[index] = a * 16777216 + b * 65536 + c * 256 + d - 2147483648
			i = i + 4
		elseif typ == 3 then
			t[index] = unpack("n", currentData, i)
			i = i + 8
		elseif typ == 4 then
			local length = currentData:byte(i)
			t[index] = currentData:sub(i+1, i+length)
			i = i + 1 + length
		elseif typ == 5 then
			local a, b = currentData:byte(i, i+1)
			local length = a * 256 + b
			t[index] = currentData:sub(i+2, i+1+length)
			i = i + 2 + length
		elseif typ == 6 then
			local a, b, c, d = currentData:byte(i, i+3)
			local length = a * 16777216 + b * 65536 + c * 256 + d
			t[index] = currentData:sub(i+4, i+3+length)
			i = i + 4 + length
		elseif typ == 7 then
			t[index] = true
		elseif typ == 8 then
			t[index] = false
		elseif typ == 9 then
			t[index] = nil
		elseif typ == 13 then
			t[index], i = unpack(i, currentData, true)
		elseif typ == 14 then
			t[index], i = unpack(i, currentData, false)
		else
			return t, i
		end
	end
end

local function unpackMain(s)
	return unpack(2, s, s:byte(1) == 13)
end

return {pack = packMain, unpack = unpackMain}