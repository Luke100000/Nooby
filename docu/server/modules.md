# Modules

Nooby includes several built-in modules. The packet header contains the module name and any module-specific fields.

## Common header fields

- `m`: module responsible for processing the packet, or the response type. Defaults to `message`. Aliases may be used to reduce packet size.
- `u`: user ID the response originated from. For errors or pings, this may be the sender.

## Permissions

Some modules require the channel host. A private channel created without a `channel` name stores the creator's user ID as `host`. Public channels have `host: null`.

Requests without sufficient permission return an `error` response.

## `connect`

Connects to a channel and disconnects from the previous one if already connected. Open multiple connections when a client needs to join multiple channels at the same time.

When a connected client joins another channel, remaining clients in the previous channel receive `disconnected` before clients in the new channel receive `connected`.

If `channel` is omitted, a random private channel is created and the creator becomes the host. Otherwise, the user joins an existing channel or creates a public channel when the optional password is correct.

Public channels are intended for lobbies or global chats. Their settings cannot be changed.

**Alias:** `c`

**Fields**

- `channel` (optional): channel name to connect to.
- `password` (optional): password for protected channels.
- `settings` (optional): channel settings used only when creating a private channel. See [`settings`](#settings).

### Response

- `channel`: generated channel name when creating a new private channel.
- `host`: host user ID for private channels, or `null` for public channels.

## `settings`

Changes channel settings on private channels.

**Permission:** channel host

**Fields**

- `settings`: object containing one or more settings to change.

Supported `settings` keys:

- `password`: sets a new password.
- `visible`: toggles visibility in the channel list. Direct connections remain valid.
- `game`: sets the game name used for channel list filtering.
- `description`: sets the channel description shown in the channel list.
- `name`: sets the channel name shown in the channel list.
- `hostOnly`: when true, host broadcasts still reach everyone, but non-host messages only reach the host.
- `data`: free-form dictionary for game-specific lobby or progress metadata.

## `message`

Default module used to broadcast data to all clients except the sender.

In `hostOnly` channels, non-host clients only send messages to the host. Host messages still broadcast to all matching clients.

**Aliases:** `m`, default

**Fields**

- `t` (optional): dictionary of tags that receivers must match.

## `directMessage`

Sends a message directly to a single client.

In `hostOnly` channels, non-host clients may only send direct messages to the host.

**Alias:** `dm`

**Fields**

- `u`: user ID to send to.

## `tag`

Set tags for a single user.

**Permission:** no permission required for your own tags; channel host required when changing another user.

**Alias:** `t`

**Fields**

- `u` (optional): user to set tags for. Omit to set tags on yourself.
- `tag`: tag identifier.
- `value` (optional): tag value. Omit to unset the tag.

## `ping`

Returns the payload unchanged.

**Alias:** `p`

## `getChannels`

Retrieves visible channels.

**Fields**

- `game` (optional): only return channels for the matching game.

### Response

- `channels`: list of channels. Each entry includes `channel`, `name`, `description`, `game`, `data`, `password` (boolean), and `clients` (number of connected clients).

## `getTags`

Retrieves current tags for a user.

**Permission:** public for any user in the current channel.

**Fields**

- `u` (optional): user to retrieve tags for. Omit to retrieve your own tags.

### Response

- `u`: user ID the tags belong to.
- `tags`: dictionary of current tag values.

## `getStats`

Retrieves the current networking stats.

```json
{
  "outgoingMessages": 0,
  "incomingMessages": 0,
  "outgoingBytes": 0,
  "incomingBytes": 0,
  "newConnections": 0
}
```

### Response

- `stats`: current networking counters.

## Custom modules

Place custom modules in `server/modules/`, for example `myModule.js`. Use `aliases` to define shorter identifiers, and avoid duplicates across all modules.

```js
let init = function (ctx) {
  // Optional server-load hook.
};

let receive = function (ctx, client, msg) {
  // Handle messages received from clients.
};

let destroyClient = function (ctx, client) {
  // Optional cleanup hook when a client disconnects.
};

// Short names accepted in packet headers.
let aliases = ["mm"];

module.exports = {
  init,
  receive,
  destroyClient,
  aliases,
};
```

The module context exposes shared server services:

- `ctx.router`: send messages, stream payloads, and return errors.
- `ctx.clients`: connected client registry.
- `ctx.channels`: channel store and channel listing helpers.
- `ctx.stats`: networking counters.
- `ctx.modules`: loaded modules by full module name.

## Additional responses

Additional responses the server may send to clients.

### `error`

- `reason`: reason for the error, for example `permission denied`.
- `header`: header that caused the error.

### `shutdown`

The server has shut down.
