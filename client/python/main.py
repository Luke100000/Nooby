# This is the testing for the nooby Client class

from nooby import NoobyClient

noobyClient = NoobyClient()
noobyClient.init(None, 'localhost', 25000)

# connect to testChannel and say hello
noobyClient.connect('testChannel')
noobyClient.send({}, {'data': 'hello from Python'})

print('ok')
# shutdown
noobyClient.shutdown()