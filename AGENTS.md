# Repository Guidelines

## Project Structure & Module Organization

Nooby is a Node.js messaging server with client implementations and protocol documentation.

- `server/` contains the runnable server. `nooby.js` is the entry point, `socketWrapper.js` handles socket/message framing, `sockets/` contains TCP and WebSocket transports, and `nooby_modules/` contains message handlers such as `connect`, `message`, `ping`, and `settings`.
- `server/config.json` stores local runtime settings. Keep environment-specific changes out of commits unless they are intentional defaults.
- `client/lua/` contains the Lua client, benchmark, and testbench files.
- `client/js/` contains the in-progress JavaScript client and browser dependencies.
- `docu/` contains server and client documentation. Update it when packet behavior, modules, or setup steps change.

## Build, Test, and Development Commands

Run Node commands from `server/`:

```sh
cd server
npm install
npm start
```

- `npm install` installs `msgpack-js` and `websocket`.
- `npm start` runs `node nooby.js` using `server/config.json`.
- `node nooby.js` is equivalent to `npm start` and useful while debugging startup output.

Lua validation is manual. After starting the server, use files in `client/lua/`, especially `testbench.lua` and `benchmark.lua`, to exercise client behavior.

## Coding Style & Naming Conventions

Follow the existing style in touched files. JavaScript uses CommonJS (`require`, `module.exports`), semicolons are mostly omitted, and module files use lower camel case names such as `directMessage.js` and `getChannels.js`. Use four-space indentation in server JavaScript. Lua files use tabs and EmmyLua-style annotations where helpful.

Message modules should export plain functions such as `receive`, optional lifecycle hooks like `init` or `destroySocket`, and an `aliases` array when a handler supports short packet names.

## Testing Guidelines

There is no automated test runner configured. For server changes, at minimum start the server with `npm start` and verify no startup errors. For protocol or client changes, run the Lua testbench against a local server and document any manual scenarios tested in the PR. Name new ad hoc validation scripts clearly, for example `client/lua/test_<feature>.lua`.

## Commit & Pull Request Guidelines

Recent history uses short, imperative or descriptive commit messages, for example `added disconnect`, `cleanup`, and `faster lua encoding`. Keep commits focused and mention the affected area when useful, such as `server: handle malformed packet`.

Pull requests should include a brief summary, the reason for the change, manual test results, and links to related issues. Include screenshots only for browser-facing JavaScript client changes. Update `docu/` when public packet formats, module aliases, install steps, or client APIs change.
