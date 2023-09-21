# This is the testing for the Nooby client class

from nooby import NoobyClient

client = NoobyClient(
    {
        "log": lambda l: print(l),
        "onmessage": lambda m: print(m),
    },
    "localhost",
    25000,
)

# Connect to testChannel and say hello
client.connect("testChannel")
for i in range(100):
    client.send({}, {"data": "Hello from Python (" + str(i) + ")"})

# Shutdown
client.shutdown()
