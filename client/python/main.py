# This is the testing for the nooby Client class

from nooby import NoobyClient

noobyClient = NoobyClient()
noobyClient.init({
    'log': lambda l:print(l),
    'onmessage': lambda m:print(m),
}, 'localhost', 25000)

# connect to testChannel and say hello
noobyClient.connect('testChannel')
for i in range(100):
    noobyClient.send({}, {'data': 'hello from Python('+str(i)+')'})

# shutdown
noobyClient.shutdown()