# MelodyMeet Podcast API

**Base URL:** `/api/podcasts`  
**WebSocket namespace:** `/podcast` (JWT optional for guests/listeners; operator host should send token)

Authentication: all routes below require `Authorization: Bearer <JWT>` unless marked **Public**.

---

## Episodes (Podcast CRUD)

Episodes are stored in the `Podcasts` table — each row is one episode.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List episodes (`?status`, `?host`, `?search`, `?page`, `?limit`) |
| POST | `/` | Yes | Create metadata-only episode (JSON body) |
| POST | `/upload` | Yes | Multipart upload: `file` or `audioFile`, optional `coverArt` / `thumbnail` |
| POST | `/cover-art` | Yes | Upload cover image only (`coverArt` field) |
| GET | `/:id` | Yes | Get episode by id |
| PUT | `/:id` | Yes | Update episode metadata |
| PUT | `/:id/status` | Yes | `{ status: Draft \| Published \| Scheduled, scheduleDate? }` |
| DELETE | `/:id` | Yes | Delete episode and associated files |

### Create episode (JSON)

```json
{
  "title": "Morning Beats Ep. 12",
  "description": "Weekly roundup",
  "genre": "Talk",
  "seasonNumber": 1,
  "episodeNumber": 12,
  "status": "Draft",
  "host": "DJ MAVERICK"
}
```

---

## Recordings

Studio recordings are raw audio assets before they become published episodes.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/recordings` | Yes | List recordings (`?source`, `?search`) |
| POST | `/recordings/upload` | Yes | Multipart `file` |
| POST | `/recordings/:id/trim` | Yes | `{ name?, trimRanges: [{ start, end }] }` (percent 0–100) |
| POST | `/recordings/:id/volume` | Yes | `{ volumeMultiplier: 0.1–10 }` |
| DELETE | `/recordings/:id` | Yes | Delete recording and file |

---

## Live Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/live/sessions` | Yes | List sessions (`?status`, `?roomId`) |
| POST | `/live/start` | Yes | `{ title, description?, roomId, roomLink?, host? }` |
| POST | `/live/stop` | Yes | `{ roomId, peakViewers?, lastViewerCount? }` |
| PUT | `/live/viewers` | Yes | `{ roomId, viewerCount }` |

---

## Guest Slots (shareable mic links — primary flow)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/guest-slots/links/generate` | Yes | Generate MIC 2–5 join URLs |
| GET | `/guest-slots/slots/:roomId` | Yes | Current slot occupancy |
| POST | `/guest-slots/join` | **Public** | Guest claims slot `{ roomId, slotId, guestName, guestToken? }` |
| POST | `/guest-slots/leave` | **Public** | Guest releases slot `{ roomId, slotId, guestToken }` |
| DELETE | `/guest-slots/slots/:roomId/:slotId` | Yes | Operator kick |
| PATCH | `/guest-slots/slots/:roomId/:slotId/mute` | Yes | `{ muted: true\|false }` |
| PATCH | `/guest-slots/slots/:roomId/:slotId/volume` | Yes | `{ volume: 0–200 }` or `{ delta: ±10 }` |

---

## Legacy Guest Approval Flow

For open-connect listeners who request mic access without a pre-assigned slot.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/live/guests/join` | **Public** | `{ roomId, name, device? }` — creates pending request |
| GET | `/live/guests/:roomId` | Yes | List requests (`?status=pending`) |
| PUT | `/live/guests/:id/respond` | Yes | `{ action: approve \| deny }` |
| DELETE | `/live/guests/:id` | Yes | Remove guest request |

---

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Yes | List (`?category`, `?read`, `?limit`) |
| POST | `/notifications` | Yes | Create `{ title, message, type?, category? }` |
| PUT | `/notifications/:id/read` | Yes | Mark one read |
| PUT | `/notifications/mark-all-read` | Yes | Mark all read (`?category`) |
| DELETE | `/notifications` | Yes | Clear all (`?category`) |

---

## Mic Presets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/mics` | Yes | List mic presets (seeds defaults on first call) |
| POST | `/mics` | Yes | Create mic |
| PUT | `/mics/:id` | Yes | Update mic |
| DELETE | `/mics/:id` | Yes | Delete mic |

---

## WebSocket Events (namespace `/podcast`)

### Client → Server

| Event | Description |
|-------|-------------|
| `host_join` / `operator_join` | Operator joins room `{ roomId }` |
| `host_chat_message` / `operator_chat_message` | Host chat `{ roomId, name, text }` |
| `audience_join` / `openconnect_join` | Listener `{ roomId, name, device? }` |
| `listener_chat_message` / `openconnect_chat_message` | Listener chat |
| `guest_request` | Legacy mic request `{ roomId, name, device? }` |
| `guest_joined` | Slot guest connected `{ roomId, slotId, guestName, guestId, guestToken }` |
| `guest_left` | Slot guest left `{ roomId, slotId, guestToken }` |
| `guest_speaking` | VAD indicator `{ roomId, slotId, speaking }` |
| `guest_mic_toggle` | Guest self-mute `{ roomId, slotId, muted }` |
| `webrtc_offer` / `webrtc_answer` / `webrtc_ice_candidate` | WebRTC signaling |

### Server → Client

| Event | Description |
|-------|-------------|
| `room_snapshot` | `{ roomId, viewerCount, chatHistory }` on host join |
| `chat_history` / `chat_message` | Live chat |
| `viewer_count` | `{ roomId, viewerCount }` |
| `live_ended` | Session stopped |
| `slot_updated` / `guest_joined` / `guest_left` | Slot occupancy |
| `guest_muted` / `guest_unmuted` / `guest_volume_changed` | Operator controls |
| `guest_removed` | Operator kicked guest |
| `guest_request` / `guest_update` | Legacy approval queue |

---

## Storage

| Layer | Used for |
|-------|----------|
| **PostgreSQL** | Episodes, recordings, live sessions, guests, mics, notifications |
| **Disk (`/uploads`)** | Audio files and cover art |
| **In-memory (socket process)** | Live chat history, presence, viewer counts |

Redis and BullMQ are **not** used in the operator service — live state is held in the socket layer and persisted viewer counts sync to PostgreSQL via `PUT /live/viewers`.

---

## Postman

Import `docs/Podcast.postman_collection.json`. Set collection variables:

- `baseUrl` — e.g. `http://localhost:5000`
- `token` — operator JWT from `POST /api/auth/login`
