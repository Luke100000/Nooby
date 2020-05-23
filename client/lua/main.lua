local dir = (...):match("(.*/)") or ""

for i = 1, 1000 do
local nooby = require(dir .. "nooby")("localhost", "25000")
end

os.exit()