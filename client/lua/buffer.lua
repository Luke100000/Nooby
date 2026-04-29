local Buffer = {}
Buffer.__index = Buffer
Buffer.__len = function(self)
	return self.size
end

local function reset(self)
	self.chunks = {}
	self.first = 1
	self.last = 0
	self.offset = 1
	self.size = 0
end

local function take(self, length)
	if length <= 0 then
		return ""
	end

	assert(length <= self.size, "not enough buffered data")

	local out = {}
	local remaining = length

	while remaining > 0 do
		local chunk = self.chunks[self.first]
		local available = #chunk - self.offset + 1
		local used = math.min(available, remaining)

		out[#out + 1] = chunk:sub(self.offset, self.offset + used - 1)
		self.offset = self.offset + used
		self.size = self.size - used
		remaining = remaining - used

		if self.offset > #chunk then
			self.chunks[self.first] = nil
			self.first = self.first + 1
			self.offset = 1
		end
	end

	if self.size == 0 then
		reset(self)
	end

	return table.concat(out)
end

function Buffer:put(data)
	if data and #data > 0 then
		self.last = self.last + 1
		self.chunks[self.last] = data
		self.size = self.size + #data
	end
	return self
end

function Buffer:get(first, last)
	if last ~= nil then
		return take(self, first), take(self, last - first)
	end
	return take(self, first)
end

local buffer = {}

function buffer.new()
	local self = setmetatable({}, Buffer)
	reset(self)
	return self
end

return buffer
