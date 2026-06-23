# MelodyMeet Backend V2 — Architecture Design
**Date:** June 22, 2026  
**Status:** Final — Approved for Implementation

---

## Architecture Decisions

| # | Decision | Choice |
|---|---|---|
| Scope | Extend in-place, no parallel V2 | Preserve public API compatibility |
| Database | Keep existing integer PKs | UUID only for new entities |
| Storage | Abstraction layer, default Local | Swap to S3/R2/Azure via config |
| Jobs | BullMQ + Redis | Meaningful jobs only |
| Language | JavaScript | No TypeScript migration |
| RBAC | Removed | authenticate + ownership checks only |
| Admin module | Postponed to Phase 2 | Not needed now |
| Abstraction layers | Minimal | Add complexity only when needed |
| Analytics | Meaningful events only | No UI micro-events |

---

## Non-Negotiable Rules

1. Backend NEVER imports from `melodymeet-audio-engine/`
2. Backend NEVER imports Electron, React, window, audio, IPC
3. Audio Engine communicates via POST /api/v2/engine/events only
4. Backend stores metadata ONLY — never PCM, EQ, DSP, routing, playback
5. Every module: controller / service / model / routes / validator
6. Every module independently testable
7. No frontend-specific APIs — clean REST/WebSocket for any client
8. No RBAC — authentication + resource ownership only
9. Engine events: log only meaningful state changes, never meter ticks

---

## Implementation Order

```
1.  Authentication     (existing — audit + harden)
2.  User / Profile     (own resources only)
3.  Studio             (RJ studio state)
4.  Media Library      (tracks, local files)
5.  Uploads            (storage abstraction + chunked)
6.  Podcast            (episode CRUD)
7.  Recordings         (recording metadata)
8.  Live Sessions      (live session lifecycle)
9.  Guests             (guest slot management)
10. Notifications      (user-scoped, real-time)
11. Analytics          (meaningful business events)
12. Scheduling         (episode auto-publish)
13. Engine Events      (metadata persistence only)
14. Background Jobs    (BullMQ processors)
15. Monitoring         (health endpoints, logging)
16. Cloud Storage      (S3/R2/Azure providers)
```


---

## 1. System Architecture

```
CLIENTS (Any)
React | Electron | iOS | Android | CLI | Admin Dashboard
                      |
                  HTTPS / WSS
                      |
              API GATEWAY LAYER
     Express 5 | Helmet | CORS | Rate Limiting
                      |
          +-----------+-----------+
          |                       |
      REST API               WebSocket
      /api/*                 Socket.IO 4
      /api/v2/*              /rj
                             /podcast
                             /chat
                             /stream
                             /notifications
                             /engine
          |
      SERVICE LAYER
      Business logic | Orchestration
          |
    +-----+-----+----------+
    |           |          |
Repository   Storage    BullMQ
(Sequelize)  Provider   + Redis
             Local/S3   Queues
             R2/Azure
    |
PostgreSQL
(Sequelize + raw pg for auth)

AUDIO ENGINE (JUCE C++) — completely separate system
Never imported. Never called directly.
Communicates only: POST /api/v2/engine/events
Backend persists metadata. Never audio buffers.
```

---

## 2. Folder Structure

```
melodymeet-backend/
└── services/
    └── operator/
        ├── server.js                    entry point
        ├── package.json
        ├── .env / .env.example
        ├── seed.js
        │
        ├── config/
        │   ├── db.config.js             Sequelize (keep as-is)
        │   ├── env.validator.js         extend for Redis + Storage vars
        │   ├── stream.config.js         keep as-is
        │   ├── redis.config.js          NEW: Redis/BullMQ connection
        │   └── storage.config.js        NEW: storage provider config
        │
        ├── auth/                        keep as-is (complete)
        │   ├── config.js
        │   ├── db.js
        │   ├── middleware.js
        │   ├── migrate.js
        │   ├── models/
        │   ├── routes/
        │   ├── services/
        │   └── sql/
        │
        ├── middleware/
        │   ├── rate-limit.middleware.js  extend, keep as-is
        │   ├── validation.middleware.js  keep as-is
        │   └── ownership.middleware.js   NEW: ownsStudio, ownsPodcast, ownsRecording
        │
        ├── utils/
        │   ├── errors.js                keep + extend
        │   ├── validators.js            keep + extend
        │   ├── logger.js                NEW: Winston structured logging
        │   ├── pagination.js            NEW: offset/cursor pagination helper
        │   └── response.js              NEW: standard success/error envelope
        │
        ├── storage/                     NEW: pluggable storage abstraction
        │   ├── storage.provider.js      interface: upload/download/delete/getUrl
        │   ├── local.provider.js        current disk logic extracted here
        │   ├── s3.provider.js           S3 implementation
        │   ├── r2.provider.js           Cloudflare R2
        │   ├── azure.provider.js        Azure Blob
        │   └── storage.factory.js       reads STORAGE_PROVIDER env, returns provider
        │
        ├── jobs/                        NEW: BullMQ
        │   ├── queue.js                 queue registry
        │   ├── worker.js                worker registry
        │   └── processors/
        │       ├── episode.publish.processor.js
        │       ├── recording.cleanup.processor.js
        │       ├── notification.processor.js
        │       └── analytics.aggregate.processor.js
        │
        ├── modules/                     NEW: feature modules (gradual migration)
        │   │
        │   ├── users/
        │   │   ├── user.model.js        extend existing User model
        │   │   ├── user.service.js
        │   │   ├── user.controller.js
        │   │   ├── user.routes.js       /api/v2/profile/*
        │   │   └── user.validator.js
        │   │
        │   ├── studios/
        │   │   ├── studio.service.js    refactor from rj.service.js
        │   │   ├── studio.controller.js refactor from rj.controller.js
        │   │   ├── studio.routes.js     keep /api/rj/* paths
        │   │   └── studio.validator.js
        │   │
        │   ├── podcast/
        │   │   ├── episode/
        │   │   │   ├── episode.service.js
        │   │   │   ├── episode.controller.js
        │   │   │   ├── episode.routes.js
        │   │   │   └── episode.validator.js
        │   │   ├── recording/
        │   │   │   ├── recording.service.js
        │   │   │   ├── recording.controller.js
        │   │   │   ├── recording.routes.js
        │   │   │   └── recording.validator.js
        │   │   ├── live-session/
        │   │   │   ├── live-session.service.js
        │   │   │   ├── live-session.controller.js
        │   │   │   └── live-session.routes.js
        │   │   ├── guest/
        │   │   │   ├── guest.service.js
        │   │   │   ├── guest.controller.js
        │   │   │   └── guest.routes.js
        │   │   └── podcast.socket.js   refactor from existing
        │   │
        │   ├── media-library/
        │   │   ├── media.service.js
        │   │   ├── media.controller.js
        │   │   └── media.routes.js
        │   │
        │   ├── uploads/
        │   │   ├── upload.service.js   audio.service.js refactored
        │   │   ├── upload.controller.js
        │   │   ├── upload.routes.js    /api/v2/uploads/*
        │   │   └── upload.validator.js
        │   │
        │   ├── notifications/
        │   │   ├── notification.model.js   extend PodcastNotification
        │   │   ├── notification.service.js
        │   │   ├── notification.controller.js
        │   │   ├── notification.routes.js  /api/v2/notifications/*
        │   │   └── notification.socket.js  NEW: /notifications namespace
        │   │
        │   ├── analytics/
        │   │   ├── analytics.model.js  NEW: analytics_events table
        │   │   ├── analytics.service.js extend existing
        │   │   ├── analytics.controller.js
        │   │   └── analytics.routes.js /api/v2/analytics/*
        │   │
        │   ├── scheduling/
        │   │   ├── schedule.service.js
        │   │   ├── schedule.controller.js
        │   │   └── schedule.routes.js  /api/v2/schedule/*
        │   │
        │   └── engine/
        │       ├── engine.event.handler.js  receives + persists engine events
        │       ├── engine.routes.js         POST /api/v2/engine/events
        │       └── engine.socket.js         relays events to operator UIs
        │
        ├── models/        existing models (kept during migration)
        ├── controllers/   existing controllers (kept during migration)
        ├── routes/        existing routes (kept during migration)
        ├── services/      existing services (kept during migration)
        ├── sockets/       existing sockets (kept during migration)
        └── uploads/       local upload directory
```


---

## 3. Domain Model

```
Identity Domain
├── AuthAccount         (auth schema — raw SQL)
├── User                (Sequelize — owns own resources only)
└── OperatorProfile     (Sequelize — 1:1 with User)

Studio Domain
├── RjStudio            (Sequelize)
├── RjPlaylistItem      (Sequelize)
├── RjLocalFile         (Sequelize)
├── RjChatBan           (Sequelize)
└── RjNotification      (Sequelize)

Stream Domain
├── Stream              (Sequelize)
└── Track               (Sequelize)

Podcast Domain
├── Podcast (Episode)   (Sequelize)
├── PodcastRecording    (Sequelize)
├── PodcastLiveSession  (Sequelize)
├── PodcastGuest        (Sequelize)
└── PodcastMic          (Sequelize — add operatorId)

Activity Domain
├── ChatMessage         (Sequelize)
├── SongRequest         (Sequelize)
└── StreamReaction      (Sequelize)

Notification Domain
└── PodcastNotification (Sequelize — add userId)

Analytics Domain
└── AnalyticsEvent      (NEW — meaningful business events only)

Engine Events Domain
└── EngineEventLog      (NEW — metadata only, no audio data)

Upload Domain
└── FileUpload          (NEW — storage audit + cleanup)
```

---

## 4. Database Schema

### Additive changes to existing tables (no breaking changes)

```sql
-- Users: add soft delete + authUid index
ALTER TABLE "Users"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "idx_users_deleted_at" ON "Users" ("deletedAt");

-- Podcasts: add operator ownership
ALTER TABLE "Podcasts"
  ADD COLUMN IF NOT EXISTS "operatorId" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "deletedAt"  TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "idx_podcasts_operator" ON "Podcasts" ("operatorId");

-- PodcastLiveSessions: add operator ownership
ALTER TABLE "PodcastLiveSessions"
  ADD COLUMN IF NOT EXISTS "operatorId" VARCHAR(120);

-- PodcastMics: add operator ownership (fixes global table bug)
ALTER TABLE "PodcastMics"
  ADD COLUMN IF NOT EXISTS "operatorId" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "studioId"   VARCHAR(120);
CREATE INDEX IF NOT EXISTS "idx_podcast_mics_operator" ON "PodcastMics" ("operatorId");

-- PodcastNotifications: add user ownership (fixes global table bug)
ALTER TABLE "PodcastNotifications"
  ADD COLUMN IF NOT EXISTS "userId" VARCHAR(120);
CREATE INDEX IF NOT EXISTS "idx_podcast_notif_user" ON "PodcastNotifications" ("userId", "read");
```

### New tables

```sql
-- analytics_events: meaningful business event log
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventType"   VARCHAR(80) NOT NULL,
  -- episode_published | live_started | live_ended | recording_complete
  -- guest_joined | guest_left | upload_complete
  "entityType"  VARCHAR(80),
  "entityId"    VARCHAR(120),
  "operatorId"  VARCHAR(120),
  "studioId"    VARCHAR(120),
  "roomId"      VARCHAR(120),
  "payload"     JSONB        NOT NULL DEFAULT '{}',
  "occurredAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_analytics_event_type"  ON "analytics_events" ("eventType", "occurredAt");
CREATE INDEX "idx_analytics_entity"      ON "analytics_events" ("entityType", "entityId");
CREATE INDEX "idx_analytics_operator"    ON "analytics_events" ("operatorId", "occurredAt");

-- engine_event_logs: metadata-only engine state log
-- NEVER stores audio buffers, PCM, waveform samples
CREATE TABLE IF NOT EXISTS "engine_event_logs" (
  "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventName"   VARCHAR(120) NOT NULL,
  -- RECORDING_STARTED | RECORDING_STOPPED | BROADCAST_STARTED
  -- BROADCAST_STOPPED | ENGINE_ERROR | DEVICE_CHANGED | DSP_PRESET_CHANGED
  "studioId"    VARCHAR(120),
  "sessionId"   VARCHAR(120),
  "severity"    VARCHAR(20)  DEFAULT 'info',
  "payload"     JSONB        NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_engine_events_name"   ON "engine_event_logs" ("eventName", "createdAt");
CREATE INDEX "idx_engine_events_studio" ON "engine_event_logs" ("studioId", "createdAt");

-- file_uploads: upload audit + cleanup tracking
CREATE TABLE IF NOT EXISTS "file_uploads" (
  "id"              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "operatorId"      VARCHAR(120),
  "storageKey"      VARCHAR(500) NOT NULL,
  "storageProvider" VARCHAR(40)  NOT NULL DEFAULT 'local',
  "publicUrl"       VARCHAR(1000),
  "originalName"    VARCHAR(255),
  "mimeType"        VARCHAR(120),
  "fileType"        VARCHAR(20),    -- audio | image
  "fileSizeBytes"   BIGINT,
  "entityType"      VARCHAR(80),
  "entityId"        VARCHAR(120),
  "status"          VARCHAR(20)  NOT NULL DEFAULT 'active',
  -- active | orphaned | deleted
  "deletedAt"       TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_file_uploads_operator" ON "file_uploads" ("operatorId");
CREATE INDEX "idx_file_uploads_entity"   ON "file_uploads" ("entityType", "entityId");
CREATE INDEX "idx_file_uploads_status"   ON "file_uploads" ("status");

-- scheduled_tasks: BullMQ job visibility
CREATE TABLE IF NOT EXISTS "scheduled_tasks" (
  "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId"       VARCHAR(200) NOT NULL UNIQUE,
  "queueName"   VARCHAR(80)  NOT NULL,
  "taskType"    VARCHAR(80)  NOT NULL,
  -- episode_publish | recording_cleanup | notification_send | analytics_aggregate
  "entityType"  VARCHAR(80),
  "entityId"    VARCHAR(120),
  "scheduledAt" TIMESTAMPTZ  NOT NULL,
  "status"      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  -- pending | running | completed | failed | cancelled
  "attempts"    INTEGER      NOT NULL DEFAULT 0,
  "lastError"   TEXT,
  "completedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX "idx_scheduled_tasks_status" ON "scheduled_tasks" ("status", "scheduledAt");
CREATE INDEX "idx_scheduled_tasks_entity" ON "scheduled_tasks" ("entityType", "entityId");
```


---

## 5. Entity Relationships

```
AuthAccount (raw SQL)
    | 1:1
    v
User (authUid)
    | 1:1
    v
OperatorProfile (authUid PK)
    |
    +-- 1:N --> RjStudio (ownerAuthUid)
    |               +-- 1:N --> RjPlaylistItem
    |               +-- 1:N --> RjLocalFile
    |               +-- 1:N --> RjNotification
    |               +-- 1:N --> RjChatBan
    |
    +-- 1:N --> Podcast/Episode (operatorId)
    |               +-- 1:N --> PodcastRecording
    |
    +-- 1:N --> PodcastLiveSession (operatorId)
    |               +-- 1:N --> PodcastGuest (roomId)
    |
    +-- 1:N --> PodcastMic (operatorId)
    +-- 1:N --> PodcastNotification (userId)
    +-- 1:N --> FileUpload (operatorId)
    +-- 1:N --> AnalyticsEvent (operatorId)

Stream
    +-- 1:N --> Track
    +-- 1:N --> LiveSession
    +-- 1:N --> ChatMessage (studioId)
    +-- 1:N --> SongRequest (studioId)
    +-- 1:N --> StreamReaction (studioId)

EngineEventLog   (standalone — no FK, metadata only)
ScheduledTask    (standalone — BullMQ job mirror)
```

---

## 6. REST API Design

All new routes go under `/api/v2/`. Existing `/api/` routes stay intact.

### Authentication (existing — keep as-is)
```
POST  /api/auth/signup
POST  /api/auth/login
POST  /api/auth/refresh
POST  /api/auth/logout
POST  /api/auth/verify-authenticator
POST  /api/auth/biometrics/enable
```

### User / Profile (own resources only — no user management API)
```
GET    /api/profile/me               Get my profile
GET    /api/profile/me/dashboard     Dashboard view
PUT    /api/profile/me               Full update
PATCH  /api/profile/me               Partial update
POST   /api/profile/me/avatar        Upload avatar
DELETE /api/v2/profile/me            Delete my account (soft delete)
```

### Studios (RJ) — all existing routes kept
```
GET    /api/rj/me/profile
GET    /api/rj/me/profile/dashboard
PATCH  /api/rj/me/profile
POST   /api/rj/me/profile/avatar
GET    /api/rj/:studioId                Studio bundle
PATCH  /api/rj/:studioId/state
POST   /api/rj/:studioId/reset
POST   /api/rj/:studioId/go-live
POST   /api/rj/:studioId/stop-live
POST   /api/rj/:studioId/timer/tick
POST   /api/rj/:studioId/announcement
PATCH  /api/rj/:studioId/stats
PUT    /api/rj/:studioId/listeners
GET    /api/rj/:studioId/playlist
POST   /api/rj/:studioId/playlist/items
PUT    /api/rj/:studioId/playlist/reorder
DELETE /api/rj/:studioId/playlist
DELETE /api/rj/:studioId/playlist/items/:itemId
POST   /api/rj/:studioId/playlist/start
POST   /api/rj/:studioId/playlist/pause
POST   /api/rj/:studioId/playlist/resume
POST   /api/rj/:studioId/playlist/stop
POST   /api/rj/:studioId/playlist/advance
POST   /api/rj/:studioId/dual-player
GET    /api/rj/:studioId/players/:playerName/effects
PATCH  /api/rj/:studioId/players/:playerName/effect
PATCH  /api/rj/:studioId/players/:playerName/effects
PATCH  /api/rj/:studioId/players/:playerName/volume
POST   /api/rj/:studioId/players/:playerName/effects/reset
POST   /api/rj/:studioId/mics
PATCH  /api/rj/:studioId/mics
DELETE /api/rj/:studioId/mics/:micId
GET    /api/rj/:studioId/local-files
POST   /api/rj/:studioId/local-files
DELETE /api/rj/:studioId/local-files/:fileId
POST   /api/rj/:studioId/local-files/:fileId/load-standby
GET    /api/rj/:studioId/notifications
POST   /api/rj/:studioId/notifications
PUT    /api/rj/:studioId/notifications/read-all
PUT    /api/rj/:studioId/notifications/:id/read
GET    /api/rj/:studioId/chat/bans
POST   /api/rj/:studioId/chat/bans
DELETE /api/rj/:studioId/chat/bans/:username
POST   /api/rj/:studioId/chat/clear
GET    /api/rj/:studioId/chat/options
POST   /api/rj/:studioId/chat/messages
PUT    /api/rj/:studioId/chat/messages/:id/pin
POST   /api/rj/:studioId/chat/gifts
POST   /api/rj/:studioId/chat/emojis
```

### Uploads (NEW)
```
POST   /api/v2/uploads/audio              Upload audio file (single, <100MB)
POST   /api/v2/uploads/image              Upload image/cover art
POST   /api/v2/uploads/chunk/init         Init chunked upload
                                          Body: { fileName, fileSize, mimeType, totalChunks }
                                          Returns: { uploadId, chunkSize }
POST   /api/v2/uploads/chunk/:uploadId    Upload one chunk
                                          Body: multipart { chunkIndex, data }
POST   /api/v2/uploads/chunk/:uploadId/complete  Finalize chunked upload
DELETE /api/v2/uploads/:id                Delete upload + remove from storage
GET    /api/v2/uploads/:id                Get upload metadata
```

### Podcasts / Episodes — existing routes kept, new ones added
```
GET    /api/podcasts                      List episodes (my own)
POST   /api/podcasts                      Create episode (metadata)
POST   /api/podcasts/upload               Upload episode file
POST   /api/podcasts/cover-art            Upload cover art
GET    /api/podcasts/:id                  Get episode
PUT    /api/podcasts/:id                  Update episode
PUT    /api/podcasts/:id/status           Update status
DELETE /api/podcasts/:id                  Delete episode

NEW:
GET    /api/v2/podcasts/:id/analytics     Episode analytics
POST   /api/v2/podcasts/:id/schedule      Schedule publish { scheduledAt: ISO }
DELETE /api/v2/podcasts/:id/schedule      Cancel scheduled publish
```

### Recordings — existing routes kept
```
GET    /api/podcasts/recordings
POST   /api/podcasts/recordings/upload
POST   /api/podcasts/recordings/:id/trim
POST   /api/podcasts/recordings/:id/volume
DELETE /api/podcasts/recordings/:id

NEW:
GET    /api/v2/recordings/:id/waveform    Get cached waveform metadata
```

### Live Sessions — existing routes kept
```
GET    /api/podcasts/live/sessions
POST   /api/podcasts/live/start
POST   /api/podcasts/live/stop
PUT    /api/podcasts/live/viewers

NEW:
GET    /api/v2/live-sessions/:id          Get session detail
GET    /api/v2/live-sessions/:id/analytics
```

### Guest Slots — all existing routes kept
```
POST   /api/podcasts/guest-slots/join                          PUBLIC
POST   /api/podcasts/guest-slots/leave                         PUBLIC
POST   /api/podcasts/guest-slots/links/generate                AUTH
GET    /api/podcasts/guest-slots/slots/:roomId                 AUTH
DELETE /api/podcasts/guest-slots/slots/:roomId/:slotId         AUTH
PATCH  /api/podcasts/guest-slots/slots/:roomId/:slotId/mute    AUTH
PATCH  /api/podcasts/guest-slots/slots/:roomId/:slotId/volume  AUTH
```

### Mics — fix ownership via v2 routes
```
-- Existing (global — keep for compatibility):
GET    /api/podcasts/mics
POST   /api/podcasts/mics
PUT    /api/podcasts/mics/:id
DELETE /api/podcasts/mics/:id

-- New (operator-scoped):
GET    /api/v2/mics           My mics only (filtered by operatorId)
POST   /api/v2/mics           Create mic (auto-assigns operatorId)
PUT    /api/v2/mics/:id       Update my mic (ownership enforced)
DELETE /api/v2/mics/:id       Delete my mic (ownership enforced)
```

### Notifications — fix ownership via v2 routes
```
-- Existing (global — keep for compatibility):
GET    /api/podcasts/notifications
POST   /api/podcasts/notifications
PUT    /api/podcasts/notifications/mark-all-read
PUT    /api/podcasts/notifications/:id/read
DELETE /api/podcasts/notifications

-- New (user-scoped):
GET    /api/v2/notifications                   My notifications (userId filtered)
GET    /api/v2/notifications/unread-count      Unread count (fast Redis read)
PUT    /api/v2/notifications/:id/read          Mark one read
PUT    /api/v2/notifications/mark-all-read     Mark all read
DELETE /api/v2/notifications/:id               Delete one
DELETE /api/v2/notifications                   Clear all
```

### Analytics — extend existing
```
GET    /api/analytics/dashboard               Existing counts
GET    /api/analytics/streams/:id             Existing stream analytics

NEW:
GET    /api/v2/analytics/dashboard            Enhanced with time-series
GET    /api/v2/analytics/studios/:studioId    Studio session history
       ?from=ISO&to=ISO&interval=day|hour
GET    /api/v2/analytics/studios/:studioId/listeners
GET    /api/v2/analytics/podcasts/:id         Episode analytics
GET    /api/v2/analytics/live-sessions        Session history
       ?from=ISO&to=ISO&page=1&limit=20
```

### Scheduling (NEW)
```
GET    /api/v2/schedule                       List my scheduled tasks
POST   /api/v2/schedule/episode/:id/publish   Schedule episode { scheduledAt: ISO }
DELETE /api/v2/schedule/episode/:id           Cancel scheduled publish
```

### Engine Events (NEW)
```
POST   /api/v2/engine/events    Receive engine event (from engine bridge)
                                Body: { event, studioId, sessionId, payload }
GET    /api/v2/engine/events    Query engine event log
       ?studioId=X&event=RECORDING_STARTED
```

### Health & Monitoring (NEW)
```
GET    /health                  Public — liveness probe
GET    /health/ready            Public — readiness (DB + Redis)
GET    /health/detailed         Auth   — full health + queue stats + socket counts
```

### Streams — existing routes kept as-is
```
GET    /api/streams
POST   /api/streams
PUT    /api/streams/:id/live
PUT    /api/streams/:id/stop
POST   /api/streams/:streamId/tracks
DELETE /api/streams/tracks/:trackId
DELETE /api/streams/:id
```

### Analytics — existing kept
```
GET    /api/analytics/dashboard
GET    /api/analytics/streams/:id
```


---

## 7. Socket Events

### `/rj` — Studio Socket (JWT required)
```
CLIENT -> SERVER
  join_studio           { studioId, username }
  sync_studio           { studioId, patch }
  dual_player_action    { studioId, action, playerId, track, crossfadeValue }
  mixer_update          { studioId, ...mixerFields }
  mic_update            { studioId, micId, isActive, isMuted, volume }
  playlist_add          { studioId, song }
  playlist_start        { studioId, durationMinutes }
  go_live               { studioId, streamName, viewerCount }
  stop_live             { studioId, viewerCount }
  listener_count        { studioId, count }
  send_message          { studioId, text, username }
  pin_message           { studioId, messageId, text }
  ban_user              { studioId, username, reason }
  announcement          { studioId, message, visible }
  playlist_tick         { studioId }

SERVER -> CLIENT
  rj_studio_state         { ...fullBundle }
  rj_dual_player_updated  { dualPlayer, currentTrack }
  rj_mixer_updated        { ...mixerState }
  rj_mics_updated         { mics }
  rj_playlist_updated     { playlist }
  rj_playlist_started     { ...result }
  rj_playlist_tick        { ...result }
  rj_playlist_advanced    { currentTrack, playlistCurrentIndex }
  rj_live_started         { studio, timestamp }
  rj_live_stopped         { studio, timestamp }
  rj_stats_updated        { stats, activeListeners, listenerHistory }
  rj_receive_message      { id, user, text, time, system }
  rj_message_pinned       { messageId, text, timestamp }
  rj_user_banned          { username, timestamp }
  rj_announcement         { visible, message }
  rj_operator_joined      { username, timestamp }
  rj_error                { message }
  -- Engine relay (NEW):
  rj_engine_event         { event, payload, studioId, timestamp }
  rj_engine_ready         { studioId }
  rj_engine_error         { studioId, error, severity }
  rj_recording_started    { studioId, sessionId, timestamp }
  rj_recording_stopped    { studioId, sessionId, duration, timestamp }
```

### `/podcast` — Podcast Socket (optional JWT)
```
CLIENT -> SERVER
  host_join              { roomId }
  audience_join          { roomId, name }
  host_chat_message      { roomId, text, name }
  guest_chat_message     { roomId, guestId, text }
  listener_chat_message  { roomId, text }
  guest_joined           { roomId, slotId, guestName, guestId, guestToken }
  guest_left             { roomId, slotId, guestToken }
  guest_speaking         { roomId, slotId, speaking }
  guest_mic_toggle       { roomId, slotId, muted }
  webrtc_offer           { roomId, slotId, sdp }
  webrtc_answer          { roomId, slotId, sdp }
  webrtc_ice_candidate   { roomId, slotId, candidate }

SERVER -> CLIENT
  room_snapshot          { roomId, viewerCount, chatHistory }
  chat_history           { roomId, messages }
  chat_message           { id, roomId, senderId, senderName, senderRole, text, createdAt }
  chat_error             { message }
  viewer_count           { roomId, viewerCount }
  live_ended             { roomId }
  slot_updated           { roomId, slotId, guestName, status }
  slot_confirmed         { roomId, slotId, guestName }
  guest_joined           { roomId, slotId, guestName, guestId, status }
  guest_left             { roomId, slotId, status }
  guest_muted            { roomId, slotId, micMuted }
  guest_unmuted          { roomId, slotId, micMuted }
  guest_volume_changed   { roomId, slotId, volume }
  guest_removed          { roomId, slotId, reason }
  guest_speaking         { roomId, slotId, speaking }
  guest_mic_toggle       { roomId, slotId, muted }
  webrtc_offer           { roomId, slotId, sdp }
  webrtc_answer          { roomId, slotId, sdp }
  webrtc_ice_candidate   { roomId, slotId, candidate }
  podcast_error          { message }
```

### `/chat` — Live Chat Socket (JWT required)
```
CLIENT -> SERVER
  join_studio      { studioId, username }
  send_message     { studioId, text, username }
  send_gift        { studioId, gift, username }
  send_sticker     { studioId, sticker, username }
  like_stream      { studioId, username }
  request_song     { studioId, songTitle, username }
  vote_song        { studioId, requestId, username }
  pin_message      { studioId, messageId, text }

SERVER -> CLIENT
  receive_message  { id, username, text, timestamp, type }
  receive_gift     { id, username, gift, timestamp }
  receive_sticker  { id, username, sticker, timestamp }
  receive_like     { id, username, timestamp }
  song_requested   { id, username, songTitle, votes, timestamp }
  song_voted       { requestId, username, votes, timestamp }
  message_pinned   { messageId, text, timestamp }
  user_joined      { username, timestamp }
  user_left        { username, timestamp }
  chat_error       { message }
```

### `/stream` — Stream Socket (JWT required)
```
CLIENT -> SERVER
  join_stream   { streamId }
  go_live       { streamId, streamName }
  end_stream    { streamId }
  health_ping   { streamId }

SERVER -> CLIENT
  viewer_update    { viewers }
  stream_started   { streamId, streamName, message, timestamp }
  stream_ended     { streamId, message, timestamp }
  health_pong      { status, bitrate, uptime, listeners }
  stream_error     { message }
```

### `/notifications` — Notifications Socket (JWT required) [NEW]
```
CLIENT -> SERVER
  subscribe    { userId }
  unsubscribe  {}

SERVER -> CLIENT
  notification   { id, title, message, type, category, createdAt }
  unread_count   { count }
```

### `/engine` — Engine Event Relay (JWT required) [NEW]
```
-- Engine sends events via POST /api/v2/engine/events (REST)
-- This namespace relays them to connected operator UIs

SERVER -> CLIENT
  engine_event        { event, payload, studioId, timestamp }
  engine_ready        { studioId }
  engine_error        { studioId, error, severity }
  recording_started   { studioId, sessionId, timestamp }
  recording_stopped   { studioId, sessionId, duration, timestamp }
  broadcast_started   { studioId, timestamp }
  broadcast_stopped   { studioId, timestamp }
```

### Socket Room Conventions
```
RJ Studio:           {studioId}
Podcast host:        podcast:{roomId}:hosts
Podcast audience:    podcast:{roomId}
Guest slot:          guest_slot:{roomId}:{slotId}
Notifications:       notifications:{userId}
Engine:              engine:{studioId}
```

### Reconnect Strategy
```
reconnection:        true
reconnectionAttempts: 10
reconnectionDelay:   1000ms
reconnectionDelayMax: 5000ms

On reconnect:
  Client re-emits join event
  Server re-sends current state snapshot
  No missed-event replay (client requests state)
  Presence cleaned up on disconnect
```


---

## 8. Authentication Flow

```
REGISTRATION
  POST /api/auth/signup
  Body: { email, password, name }
  -> bcrypt hash password (12 rounds)
  -> insert auth_users
  -> issue accessToken (15min) + refreshToken (30d)
  -> return { accessToken, refreshToken, user }

LOGIN
  POST /api/auth/login
  Body: { email, password }
  -> verify bcrypt hash
  -> if 2FA enabled -> return { requiresMfa: true, tempToken }
  -> else -> issue tokens

2FA
  POST /api/auth/verify-authenticator
  Body: { tempToken, code }
  -> verify TOTP
  -> issue full tokens

REFRESH
  POST /api/auth/refresh
  Body: { refreshToken }
  -> verify JWT_REFRESH_SECRET
  -> check not revoked in DB
  -> issue new accessToken
  -> rotate refreshToken (revoke old, issue new)

LOGOUT
  POST /api/auth/logout
  Body: { refreshToken }
  -> revoke refresh token in DB

PROTECTED ROUTES
  Authorization: Bearer <accessToken>
  -> authenticate middleware
  -> decode JWT, attach req.authUser { uid, email, type: 'access' }

OWNERSHIP CHECK (replaces RBAC)
  authenticate
    -> ownsStudio()    verifies RjStudio.ownerAuthUid === req.authUser.uid
    -> ownsPodcast()   verifies Podcast.operatorId === req.authUser.uid
    -> ownsRecording() verifies PodcastRecording joined via podcast owner
    -> ownsMic()       verifies PodcastMic.operatorId === req.authUser.uid

SOCKET AUTH
  socket.handshake.auth.token = accessToken
  -> socketAuthMiddleware verifies JWT
  -> attaches socket.data.authUser
  -> Optional auth for guest sockets (podcast namespace)
```

---

## 9. Authorization (Ownership — No RBAC)

```
PRINCIPLE
  Every operator manages only their own resources.
  No roles. No permission matrix.
  Authentication + ownership = authorization.

OWNERSHIP MIDDLEWARE
  // ownership.middleware.js

  const ownsStudio = async (req, res, next) => {
    const studio = await RjStudio.findByPk(req.params.studioId)
    if (!studio) return res.status(404).json(notFound('Studio not found'))
    if (studio.ownerAuthUid !== req.authUser.uid)
      return res.status(403).json(forbidden('Not your studio'))
    req.studio = studio
    next()
  }

  const ownsPodcast = async (req, res, next) => {
    const podcast = await Podcast.findByPk(req.params.id)
    if (!podcast) return res.status(404).json(notFound('Episode not found'))
    if (podcast.operatorId && podcast.operatorId !== req.authUser.uid)
      return res.status(403).json(forbidden('Not your episode'))
    req.podcast = podcast
    next()
  }

  const ownsRecording = async (req, res, next) => { ... }
  const ownsMic       = async (req, res, next) => { ... }
  const ownsSession   = async (req, res, next) => { ... }

PUBLIC ROUTES (no auth)
  GET  /health
  GET  /health/ready
  POST /api/auth/signup
  POST /api/auth/login
  POST /api/auth/refresh
  POST /api/auth/verify-authenticator
  POST /api/podcasts/guest-slots/join
  POST /api/podcasts/guest-slots/leave

ALL OTHER ROUTES
  authenticate middleware required
  ownership middleware on resource-specific routes
```

---

## 10. File Storage Strategy

```
ABSTRACTION INTERFACE (storage.provider.js)
  upload(buffer, options)  -> { storageKey, publicUrl }
  delete(storageKey)       -> Boolean
  exists(storageKey)       -> Boolean
  getUrl(storageKey)       -> String
  stream(storageKey)       -> ReadableStream

PROVIDERS
  LocalStorageProvider  (default)
    Root:    /uploads/
    URL:     /uploads/{filename}
    Naming:  {prefix}-{timestamp}-{uuid}.{ext}
    Prefix:  audio | cover | avatar

  S3StorageProvider
    Key:   {type}/{YYYY}/{MM}/{uuid}.{ext}
    URL:   https://{bucket}.s3.{region}.amazonaws.com/{key}

  R2StorageProvider
    Key:   {type}/{YYYY}/{MM}/{uuid}.{ext}
    URL:   https://{account}.r2.cloudflarestorage.com/{key}
    or:    https://{STORAGE_R2_PUBLIC_DOMAIN}/{key}

  AzureStorageProvider
    Blob:  {type}/{YYYY}/{MM}/{uuid}.{ext}

FACTORY (storage.factory.js)
  reads STORAGE_PROVIDER env var
  returns correct provider instance
  providers are interchangeable — no consumer code changes

CHUNKED UPLOAD FLOW
  1. POST /api/v2/uploads/chunk/init
     -> create FileUpload record (status: pending)
     -> create temp dir /uploads/tmp/{uploadId}/
     -> return { uploadId, chunkSize: 5MB }

  2. POST /api/v2/uploads/chunk/:uploadId  (x N chunks)
     -> write chunk to /uploads/tmp/{uploadId}/{chunkIndex}.part
     -> track progress in Redis

  3. POST /api/v2/uploads/chunk/:uploadId/complete
     -> verify all chunks received
     -> concatenate to final file
     -> StorageProvider.upload(finalFile)
     -> FileUpload.status = 'active'
     -> delete temp dir
     -> queue recording-processing job if audio
     -> return { id, storageKey, publicUrl }

LIMITS
  Single upload max:   100 MB
  Chunk size:          5 MB
  Chunked total max:   500 MB
  Temp dir TTL:        24 hours (cleanup job removes stale)
  Allowed audio:       mp3, wav, ogg, aac, flac, m4a, webm
  Allowed images:      jpg, jpeg, png, webp, gif, avif, bmp, heic, heif
```

---

## 11. Background Jobs

```
INFRASTRUCTURE
  Library:    BullMQ
  Backend:    Redis (REDIS_URL)
  Dashboard:  bull-board at /admin/queues (auth required)

QUEUES AND PROCESSORS

  episode-publish
    Trigger:  POST /api/v2/schedule/episode/:id/publish
    Delay:    ms until scheduledAt
    Payload:  { episodeId }
    Steps:
      1. Fetch Podcast — if status != 'Scheduled', skip
      2. SET status = 'Published', publishedAt = NOW()
      3. Update ScheduledTask -> completed
      4. Queue notification-delivery for operator
      5. Track AnalyticsEvent: episode_published
    Retries:  3, exponential backoff

  recording-processing
    Trigger:  After recording upload completes
    Delay:    0 (immediate)
    Payload:  { recordingId, fileUrl }
    Steps:
      1. ffprobe to extract duration if missing
      2. Generate waveform peak data
      3. Update PodcastRecording (durationSeconds, waveformData)
    Retries:  2

  notification-delivery
    Trigger:  notificationService.create()
    Delay:    0 (immediate)
    Payload:  { userId, notificationId }
    Steps:
      1. Fetch notification
      2. Emit to notifications:{userId} socket room
      3. INCR Redis key: notifications:unread:{userId}
    Retries:  3

  analytics-aggregate
    Trigger:  Recurring cron — hourly
    Payload:  { from, to }
    Steps:
      1. GROUP analytics_events by type/entity/hour
      2. Cache summary in Redis
      3. Delete raw events older than ANALYTICS_RETENTION_DAYS (default 90)
    Retries:  2

  file-cleanup
    Trigger:  Recurring cron — daily 02:00 UTC
    Payload:  {}
    Steps:
      1. Find FileUpload WHERE status='orphaned' AND createdAt < 24h ago
      2. Find /uploads/tmp/* dirs older than 24h
      3. StorageProvider.delete() for each
      4. UPDATE file_uploads status -> deleted
    Retries:  1

MEANINGFUL JOBS ONLY
  Not scheduled:
    Every knob/slider change         (not a job)
    Every meter update               (not a job)
    Every socket heartbeat           (not a job)
    Email queue                      (add later when needed)
```

---

## 12. Event Flow

```
LIVE SESSION (RJ Studio)
  Operator clicks Go Live
  -> POST /api/rj/:studioId/go-live
  -> RjStudio.isLive = true
  -> LiveSession record created
  -> AnalyticsEvent: { type: live_started }
  -> Socket: rj_live_started to studioId room

  Operator stops live
  -> POST /api/rj/:studioId/stop-live
  -> RjStudio.isLive = false
  -> LiveSession.status = 'ended'
  -> AnalyticsEvent: { type: live_ended }
  -> Socket: rj_live_stopped

ENGINE EVENT FLOW
  Audio Engine emits RECORDING_STARTED
  -> Electron bridge calls POST /api/v2/engine/events
     Body: { event: 'RECORDING_STARTED', studioId, sessionId, timestamp }
  -> engine.event.handler.js
  -> EngineEventLog record created
  -> AnalyticsEvent: { type: recording_started }
  -> Socket: rj_recording_started to studioId room
  -> Socket: engine_recording_started to engine:{studioId} room

  Audio Engine emits RECORDING_STOPPED
  -> POST /api/v2/engine/events
     Body: { event: 'RECORDING_STOPPED', studioId, sessionId, duration }
  -> EngineEventLog record created
  -> Queue: recording-processing job
  -> AnalyticsEvent: { type: recording_complete }
  -> Socket: rj_recording_stopped

PODCAST LIVE SESSION
  Host starts live
  -> POST /api/podcasts/live/start
  -> PodcastLiveSession created (status: live)
  -> AnalyticsEvent: { type: live_started }

  Guest joins via link
  -> POST /api/podcasts/guest-slots/join (public)
  -> PodcastGuest record created
  -> podcastSocket.emitSlotUpdated
  -> AnalyticsEvent: { type: guest_joined }

  Guest connects socket
  -> socket.emit('guest_joined', { roomId, slotId, ... })
  -> Server joins guest_slot:{roomId}:{slotId}
  -> Server emits guest_joined to podcast:{roomId}:hosts

  WebRTC signaling relay
  -> Guest: webrtc_offer -> Server -> podcast:{roomId}:hosts
  -> Host: webrtc_answer -> Server -> guest_slot:{roomId}:{slotId}
  -> ICE candidates relay same pattern

EPISODE SCHEDULING
  Operator schedules episode
  -> PUT /api/podcasts/:id/status { status: 'Scheduled', scheduleDate: ISO }
  -> BullMQ job created with delay
  -> ScheduledTask record created
  -> AnalyticsEvent: { type: episode_scheduled }

  At scheduled time
  -> episode.publish.processor fires
  -> Podcast.status = 'Published'
  -> ScheduledTask.status = 'completed'
  -> Notification queued for operator
  -> AnalyticsEvent: { type: episode_published }

NOTIFICATION FLOW
  Service creates notification
  -> PodcastNotification.create({ userId, ... })
  -> BullMQ: notification-delivery queued
  -> Processor: emit to notifications:{userId} socket
  -> Redis: INCR notifications:unread:{userId}

  Operator reads
  -> PUT /api/v2/notifications/:id/read
  -> notification.read = true
  -> Redis: DECR notifications:unread:{userId}

UPLOAD FLOW
  Single (< 100MB)
  -> POST /api/v2/uploads/audio
  -> multer -> StorageProvider.upload()
  -> FileUpload record created
  -> If audio: queue recording-processing

  Chunked (> 100MB)
  -> init -> N chunk uploads -> complete
  -> On complete: StorageProvider.upload() of final file
  -> FileUpload.status = 'active'
  -> If audio: queue recording-processing

ANALYTICS MEANINGFUL EVENTS ONLY
  Tracked:
    live_started, live_ended
    episode_published, episode_scheduled
    recording_complete
    guest_joined, guest_left
    upload_complete

  Not tracked:
    knob movements
    slider adjustments
    meter updates
    page views
    socket heartbeats
```


---

## 13. Error Handling

```
ERROR CLASSES (utils/errors.js — extend existing)
  HttpError (base)
    ValidationError   400
    AuthError         401
    ForbiddenError    403
    NotFoundError     404
    ConflictError     409
    PayloadTooLarge   413
    RateLimitError    429
    InternalError     500

SUCCESS ENVELOPE
  { "success": true, "data": { ... }, "meta": { page, limit, total, hasMore } }

ERROR ENVELOPE
  {
    "success": false,
    "error": {
      "code":      "VALIDATION_ERROR",
      "message":   "title is required",
      "details":   [ { "field": "title", "message": "title is required" } ],
      "requestId": "req-uuid"
    }
  }

GLOBAL ERROR MIDDLEWARE
  app.use((err, req, res, next) => {
    logger.error({ requestId: req.id, method, path, status, message, stack })
    // Map Sequelize/Multer/JWT errors to HttpError subclasses
    res.status(statusCode).json(errorEnvelope)
  })

ASYNC ROUTE WRAPPER
  const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)

SOCKET ERROR HANDLING
  socket.emit('{namespace}_error', { message, code })
  Unhandled errors: log + disconnect

BULLMQ ERRORS
  -> ScheduledTask.status = 'failed', lastError = err.message
  -> BullMQ retries per queue config
  -> Dead-letter: failed jobs visible in bull-board
```

---

## 14. Validation Rules

```
TOOL: Joi (existing — keep as-is)
OPTIONS: abortEarly: false, stripUnknown: true, convert: true

STRING RULES
  All strings: .trim()
  Chat text max:    5000 chars
  Title/name max:   180 chars
  Identifiers max:  120 chars
  URLs max:         500 chars
  Bio max:          2000 chars

BUSINESS RULES
  Episode:
    status = 'Scheduled' requires scheduleDate
    scheduleDate must be future datetime
    episodeNumber/seasonNumber: positive integer
    durationSeconds: 0–86400

  Live Session:
    roomId: alphanumeric only (prevents injection), 4–120 chars

  Guest Slot:
    slotId: enum mic2 | mic3 | mic4 | mic5
    guestName: 1–120 chars
    guestToken: required for leave

  Guest volume:
    0–200 (100 = unity, 200 = max)

  Chat message:
    1–5000 chars
    rate limit: 2000ms between sends per socket

  BullMQ scheduling:
    scheduledAt must be in the future
    max delay: 1 year

  Analytics event:
    eventType: max 80 chars
    payload: max 10KB JSON

  Engine event:
    event: SCREAMING_SNAKE_CASE, max 120 chars
    payload: max 50KB JSON — never audio buffers

UPLOAD VALIDATION
  Audio MIME: audio/mpeg, audio/wav, audio/ogg, audio/aac,
              audio/flac, audio/mp4, audio/webm, application/octet-stream
  Image MIME: image/jpeg, image/png, image/webp, image/gif,
              image/avif, image/bmp, image/heic, image/heif
  Audio ext:  mp3, wav, ogg, aac, flac, m4a, webm
  Image ext:  jpg, jpeg, png, webp, gif, avif, bmp, heic, heif
  Max single: 100 MB
  Max chunked: 500 MB
```

---

## 15. Rate Limiting

```
TIERS
  Auth          10 req / 15min   /api/auth/signup, /login, /verify-authenticator
  Upload        20 req / 1hr     all upload endpoints
  Guest Join    5  req / 1min    /api/podcasts/guest-slots/join (per IP)
  API General   100 req / 1min   /api/*
  Engine Events 500 req / 1min   /api/v2/engine/events (engine bridge)
  Health        unlimited        /health, /health/ready

SOCKET RATE LIMITS
  Chat messages:   1 per 2 seconds per socket (existing)
  Song requests:   1 per 30 seconds per socket
  Playlist tick:   1 per 900ms per socket
  Mic updates:     10 per second per socket

429 RESPONSE
  {
    "success": false,
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Too many requests, please try again later",
      "retryAfter": 60
    }
  }
```

---

## 16. Logging Strategy

```
LIBRARY: Winston

LEVELS
  error   unhandled exceptions, DB failures, storage errors
  warn    rate limit hits, retry attempts
  info    server start, DB connect, job completion
  http    every HTTP request (method, path, status, durationMs, requestId)
  debug   service calls, query params (dev only)

BASE LOG FIELDS
  { timestamp, level, message, requestId, service: 'operator', env }

HTTP LOG FIELDS
  { method, path, statusCode, durationMs, ip, userId }

ERROR LOG FIELDS
  { errorCode, errorName, stack }
  -- passwords, tokens, emails stripped before logging

SOCKET LOG FIELDS
  { event, namespace, socketId, roomId }

JOB LOG FIELDS
  { queue, jobId, taskType, entityId, attempt, durationMs, status }

REQUEST ID MIDDLEWARE
  req.id = crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)

PII RULES
  Never log: passwords, tokens, refreshTokens
  Email format in non-debug: u***@domain.com
  Never log audio file content or PCM data
```

---

## 17. Monitoring Strategy

```
GET /health
  200: { "status": "ok", "timestamp": "ISO" }
  Purpose: load balancer liveness

GET /health/ready
  200: { "status": "ready",   "checks": { "db": "ok", "redis": "ok" } }
  503: { "status": "degraded", "checks": { "db": "ok", "redis": "error" } }
  Purpose: Kubernetes readiness probe

GET /health/detailed  (auth required)
  {
    "status":    "ok",
    "uptime":    43200,
    "memory":    { "heapUsed": "145 MB", "rss": "312 MB" },
    "database":  { "status": "connected", "pool": { "used": 3, "idle": 7 } },
    "redis":     { "status": "connected" },
    "queues": {
      "episode-publish":      { "waiting": 2, "active": 0, "failed": 0 },
      "recording-processing": { "waiting": 0, "active": 1, "failed": 0 },
      "notification-delivery":{ "waiting": 5, "active": 0, "failed": 0 },
      "file-cleanup":         { "waiting": 0, "active": 0, "failed": 0 }
    },
    "sockets": { "/rj": 12, "/podcast": 8, "/chat": 34, "/notifications": 20 },
    "version": "1.0.0"
  }

ALERT CONDITIONS
  DB connection lost              -> ERROR log
  Redis connection lost           -> ERROR log
  Job failure rate > 10%          -> WARN log
  Engine event: ENGINE_FATAL_ERROR -> ERROR log + socket broadcast
  HTTP 500 rate > 1%              -> WARN log

BULL-BOARD
  Mounted at: /admin/queues  (auth required)
  Shows: waiting, active, completed, failed, delayed jobs
  Supports: manual retry, delete
```

---

## 18. Deployment Architecture

```
SINGLE NODE PROCESS (current)
  Node.js: Express 5 + Socket.IO 4 + BullMQ workers
  Port: 5000

DEPENDENCIES
  PostgreSQL  port 5432
  Redis       port 6379  (BullMQ + rate limiting + unread counts + upload progress)

ENVIRONMENT VARIABLES
  # Server
  PORT=5000
  NODE_ENV=production
  CORS_ORIGIN=https://app.melodymeet.com
  JSON_BODY_LIMIT=2mb

  # Database
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=melodymeet_operator
  DB_USER=postgres
  DB_PASSWORD=<strong>
  DB_POOL_MAX=10
  DB_SYNC_ALTER=false
  DB_LOGGING=false

  # Redis
  REDIS_URL=redis://localhost:6379
  REDIS_PASSWORD=<strong>

  # Auth
  JWT_ACCESS_SECRET=<min-32-chars>
  JWT_REFRESH_SECRET=<min-32-chars>
  AUTH_ENCRYPTION_KEY=<min-32-chars>
  MOBILE_HASH_SECRET=<min-32-chars>
  DEVICE_HASH_SECRET=<min-32-chars>
  REFRESH_TOKEN_DAYS=30

  # Storage
  STORAGE_PROVIDER=local       # local | s3 | r2 | azure
  STORAGE_S3_BUCKET=
  STORAGE_S3_REGION=
  STORAGE_S3_ACCESS_KEY=
  STORAGE_S3_SECRET_KEY=
  STORAGE_R2_BUCKET=
  STORAGE_R2_ACCOUNT_ID=
  STORAGE_R2_ACCESS_KEY=
  STORAGE_R2_SECRET_KEY=
  STORAGE_R2_PUBLIC_DOMAIN=
  STORAGE_AZURE_CONNECTION_STRING=
  STORAGE_AZURE_CONTAINER=

  # Upload limits
  MAX_FILE_SIZE_MB=100
  MAX_CHUNK_SIZE_MB=5
  MAX_CHUNKED_FILE_MB=500

  # BullMQ
  BULLMQ_CONCURRENCY=5
  BULLMQ_MAX_ATTEMPTS=3

  # Analytics
  ANALYTICS_RETENTION_DAYS=90

  # Frontend (guest links)
  FRONTEND_URL=https://app.melodymeet.com

  # Logging
  LOG_LEVEL=info

HORIZONTAL SCALING PATH (when needed)
  1. Redis adapter for Socket.IO
     -> Multiple Node instances share socket rooms via Redis pub/sub
     npm install @socket.io/redis-adapter

  2. Separate BullMQ worker process
     node worker.js (scale independently from API)

  3. PostgreSQL read replica
     -> Analytics queries -> replica
     -> Writes -> primary

  4. Switch storage to S3/R2
     STORAGE_PROVIDER=r2  (no code changes needed)

  5. Load balancer (nginx / ALB)
     -> Redis adapter preferred over sticky sessions
```

---

## Phase 0 Gap Analysis Summary

### What exists and works well
- JWT auth with 2FA and biometrics
- Full RJ studio state management + socket sync
- Complete podcast episode + recording lifecycle
- Guest slot system (reconnect tokens, mute, volume)
- WebRTC signaling relay
- Comprehensive Joi validation
- Rate limiting on critical paths

### What V2 adds
| Gap | Solution |
|---|---|
| Global PodcastMic table | Add operatorId column |
| Global PodcastNotification table | Add userId column |
| No storage abstraction | New storage/ module (default: local) |
| No chunked uploads | New /api/v2/uploads/chunk/* endpoints |
| No background jobs | BullMQ + Redis with 4 processors |
| No episode scheduling | episode-publish BullMQ job |
| No recording post-processing | recording-processing BullMQ job |
| No real-time notifications | /notifications socket namespace |
| No analytics time-series | analytics_events table + v2 routes |
| No engine event persistence | engine_event_logs table + v2 routes |
| No upload audit/cleanup | file_uploads table + file-cleanup job |
| No health endpoints | /health, /health/ready, /health/detailed |
| No structured logging | Winston logger |
| No ownership enforcement on mics/notifications | v2 routes + ownership.middleware.js |

---

*End of Phase 1 Architecture Design*
*Next: Phase 2 — Implementation (module by module, per implementation order)*
