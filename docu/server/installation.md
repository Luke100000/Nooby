# Server Installation

## Requirements

Node.js and npm.

## Running the server

Clone the repository, enter the server directory, install dependencies, and start the `nooby.js` entry point.

```bash
git clone https://github.com/Luke100000/Nooby
cd Nooby/server
npm install
npm start
```

You can also run the entry point directly:

```bash
node ./nooby.js
```

Run the automated server tests with:

```bash
npm test
```

## Configuration

Configuration is stored in [`server/config.json`](/server/config.json).

- `logging`: prints additional runtime information to the console.
- `verbose`: prints every incoming and outgoing message header.
- `portTCP`: TCP socket port.
- `portWebSocket`: WebSocket port.

Use TCP for native clients and WebSocket for browser-based clients.
