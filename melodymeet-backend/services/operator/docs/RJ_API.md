# MelodyMeet RJ Studio API

Base URL: `/api/rj`  
WebSocket namespace: `/rj`  
Auth: `Authorization: Bearer <access_token>` on all REST and socket connections.

`studioId` is the stream/studio UUID (same as `streamId` used in `/api/streams` and activity `studioId`).

---

## Studio bundle

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:studioId` | Full studio: state, playlist, local files, notifications, bans, chat, library catalog |
| PATCH | `/:studioId/state` | Partial update (dual player, mixer, mics, stats, announcement, timer) |
| POST | `/:studioId/reset` | Reset studio data to defaults |

## Live broadcast

| Method | Path | Description |
|--------|------|-------------|
| POST | `/:studioId/go-live` | Go live (stream + live session + studio flag) |
| POST | `/:studioId/stop-live` | End broadcast |
| POST | `/:studioId/timer/tick` | Increment live timer by 1 second |
| POST | `/:studioId/announcement` | Set on-air announcement banner |

## Playlist

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:studioId/playlist` | List playlist items |
| POST | `/:studioId/playlist/items` | Add custom item |
| POST | `/:studioId/playlist/library` | Add from catalog `{ title, artist? }` |
| PUT | `/:studioId/playlist/reorder` | `{ orderedIds: [uuid, ...] }` |
| DELETE | `/:studioId/playlist` | Clear playlist |
| DELETE | `/:studioId/playlist/items/:itemId` | Remove item |
| POST | `/:studioId/playlist/start` | Start session `{ durationMinutes? }` |
| POST | `/:studioId/playlist/pause` | Pause |
| POST | `/:studioId/playlist/resume` | Resume |
| POST | `/:studioId/playlist/stop` | Stop |
| POST | `/:studioId/playlist/advance` | Skip to next track |
| POST | `/:studioId/playlist/tick` | 1s tick: advances track when song duration elapsed; decrements session minutes once per 60s |

**Playlist timing:** `playlistTrackStartedAt` + `playlistTrackElapsedMs` track per-song playhead. Pause/resume preserves elapsed time. Session timer uses `playlistSessionLastTickAt` (one minute per 60s, not per tick).

**Mixer:** `PATCH /mixer` accepts all 6 channels with `isMuted` / `isSolo` / `isCue`, `volume`, and `fx` as `["beat_wheels:50", "echo"]`. Crossfader syncs to dual-player `crossfadeValue`.

## Dual player

| Method | Path | Body `action` |
|--------|------|----------------|
| POST | `/:studioId/dual-player` | `load_standby`, `play_standby`, `crossfade_to_a`, `crossfade_to_b`, `set_crossfade`, `pause_active`, `stop_active`, `stop_standby`, `pause_standby`, `library_next`, `library_prev`, `clear_all` |

## Mixer (CH1–CH6)

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/:studioId/mixer` | Update channel(s), master gain, crossfader, selected FX |

## Mics

| Method | Path | Description |
|--------|------|-------------|
| POST | `/:studioId/mics` | Add mic `{ name }` |
| PATCH | `/:studioId/mics` | Patch mic `{ micId, isActive?, isMuted?, volume?, name? }` |
| DELETE | `/:studioId/mics/:micId` | Remove extra mic |

## Local files

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:studioId/local-files` | List uploaded files |
| POST | `/:studioId/local-files` | Multipart `audioFile` |
| DELETE | `/:studioId/local-files/:fileId` | Delete file |
| POST | `/:studioId/local-files/:fileId/load-standby` | Load into standby deck |

## Operator profile (RJ / host identity)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me/profile` | **Your** profile (from JWT — no stream id needed) |
| GET | `/me/profile/dashboard` | Full dashboard for logged-in operator |
| PATCH | `/me/profile` | Create / update your profile |
| POST | `/me/profile/avatar` | Multipart field `avatar` — JPG/PNG/WEBP/GIF (updates profile photo) |
| GET | `/:studioId/profile` | Profile by studio id (optional) |
| GET | `/:studioId/profile/dashboard` | Dashboard by studio id |
| PATCH | `/:studioId/profile` | Update by studio id |

Profile is stored in `operatorProfile` (JSON) on the studio row. Ending a live broadcast appends a highlight to `bestLiveEvents` when peak listeners &gt; 0.

---

## Stats & listeners

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/:studioId/stats` | Set or increment stats |
| PUT | `/:studioId/listeners` | `{ count }` sync listener count |

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:studioId/notifications` | List (`?unreadOnly=true`) |
| POST | `/:studioId/notifications` | Create alert |
| PUT | `/:studioId/notifications/:id/read` | Mark read |
| PUT | `/:studioId/notifications/read-all` | Mark all read |

## Chat & moderation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/:studioId/chat/messages` | Post message (ban check) |
| PUT | `/:studioId/chat/messages/:messageId/pin` | Pin message |
| GET | `/:studioId/chat/bans` | List bans |
| POST | `/:studioId/chat/bans` | Ban user |
| DELETE | `/:studioId/chat/bans/:username` | Unban |
| POST | `/:studioId/chat/clear` | Clear chat history |

---

## WebSocket `/rj`

| Event (client → server) | Description |
|-------------------------|-------------|
| `join_studio` | `{ studioId, username? }` → receives `rj_studio_state` |
| `sync_studio` | `{ studioId?, patch? }` |
| `dual_player_action` | Same body as REST dual-player |
| `mixer_update` | Mixer patch |
| `mic_update` | Mic patch |
| `playlist_add` | Add song |
| `playlist_start` | Start playlist |
| `go_live` / `stop_live` | Broadcast control |
| `listener_count` | `{ count }` |
| `send_message` | Chat |
| `pin_message` | Pin |
| `ban_user` | Ban |
| `announcement` | Banner |

| Event (server → client) | Description |
|-------------------------|-------------|
| `rj_studio_state` | Full bundle |
| `rj_dual_player_updated` | Deck state |
| `rj_mixer_updated` | Mixer state |
| `rj_mics_updated` | Mic list |
| `rj_playlist_updated` | Queue |
| `rj_playlist_started` | Session started |
| `rj_live_started` / `rj_live_stopped` | Broadcast |
| `rj_stats_updated` | Listeners & stats |
| `rj_receive_message` | Chat message |
| `rj_announcement` | Banner |
| `rj_error` | Errors |

Legacy chat/stream sockets (`/chat`, `/stream`) remain available for listener apps.
