# MelodyMeet Podcast API

Base URL: `/api/podcasts`  
WebSocket namespace: `/podcast` (JWT optional for guests/listeners; operator host should send token)

## Episodes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List episodes |
| POST | `/` | Create metadata episode |
| POST | `/upload` | Multipart: `file` or `audioFile`, optional `coverArt` / `thumbnail` |
| POST | `/cover-art` | Upload cover image only |
| GET | `/:id` | Get episode |
| PUT | `/:id` | Update episode |
| PUT | `/:id/status` | `{ status: Draft \| Published \| Scheduled }` |
| DELETE | `/:id` | Delete episode + files |

## Recordings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/recordings` | List studio recordings |
| POST | `/recordings/upload` | Multipart `file` |
| POST | `/recordings/:id/trim` | `{ name, trimRanges: [{ start, end }] }` (percent 0–100) |
| POST | `/recordings/:id/volume` | `{ volumeMultiplier }` |
| DELETE | `/recordings/:id` | Delete recording |

## Live sessions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/live/sessions` | List sessions |
| POST | `/live/start` | `{ title, description?, roomId, roomLink?, host? }` |
| POST | `/live/stop` | `{ roomId, peakViewers?, lastViewerCount? }` |
| PUT | `/live/viewers` | `{ roomId, viewerCount }` |

## Guests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/live/guests/:roomId` | List guests (`?status=pending`) |
| POST | `/live/guests/join` | Guest join request |
| PUT | `/live/guests/:id/respond` | `{ action: approve \| deny }` |
| DELETE | `/live/guests/:id` | Remove guest |

## Mics & notifications

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/mics` | Operator mic presets |
| GET/POST | `/notifications` | In-app notifications |

## Socket events (namespace `/podcast`)

| Emit (client) | Description |
|---------------|-------------|
| `host_join` | Operator joins room `{ roomId }` |
| `host_chat_message` | Host chat `{ roomId, name, text }` |
| `audience_join` | Listener `{ roomId, name, device? }` |
| `guest_request` | Request mic `{ roomId, name, device? }` |

| Listen (server) | Description |
|-----------------|-------------|
| `room_snapshot` | Guests, viewer count, chat history |
| `chat_message` | New chat line |
| `guest_request` / `guest_update` | Guest queue |
| `viewer_count` | Live audience size |
| `live_ended` | Session stopped |
