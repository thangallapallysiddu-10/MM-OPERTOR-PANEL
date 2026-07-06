# MelodyMeet Operator Panel - Database Schema Documentation

**Project:** MM-OPERATOR-PANEL  
**Database Type:** PostgreSQL  
**ORM:** Sequelize  
**Last Updated:** 2026-07-03

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Authentication Schema](#authentication-schema)
3. [Operator & Profile Schema](#operator--profile-schema)
4. [RJ (Radio Jockey) Studio Schema](#rj-radio-jockey-studio-schema)
5. [Podcast Schema](#podcast-schema)
6. [Streaming & Activity Schema](#streaming--activity-schema)
7. [Database Configuration](#database-configuration)
8. [Indexes & Relationships](#indexes--relationships)

---

## Database Overview

The MelodyMeet Operator Panel uses a **PostgreSQL** database with two distinct systems:
- **Sequelize ORM Models** - Application-level data (operator profiles, podcasts, RJ studios, streams)
- **Raw PostgreSQL Schema** - Authentication system (users, devices, tokens)

### Environment Variables Required
```
DB_NAME          # Database name
DB_USER          # Database user
DB_PASSWORD      # Database password
DB_HOST          # Default: localhost
DB_PORT          # Default: 5432
DB_LOGGING       # Enable SQL logging (true/false)
DB_POOL_MAX      # Max connections (default: 10)
DB_POOL_MIN      # Min connections (default: 0)
DB_POOL_ACQUIRE  # Acquire timeout in ms (default: 30000)
DB_POOL_IDLE     # Idle timeout in ms (default: 10000)
```

---

## Authentication Schema


### 1. `auth_users` Table

Stores user authentication credentials with encrypted mobile numbers and optional authenticator support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `uid` | VARCHAR(32) | PRIMARY KEY, DEFAULT nextval('users_uid_seq')::TEXT | User unique identifier |
| `id` | BIGSERIAL | UNIQUE NOT NULL | Auto-increment ID |
| `username` | VARCHAR(32) | | User display name |
| `password_hash` | TEXT | NOT NULL | Hashed password |
| `mobile_number_encrypted` | TEXT | | Encrypted mobile (legacy) |
| `mobile_number_hash` | VARCHAR(128) | | Hash of mobile number |
| `mobile_encrypted` | TEXT | NOT NULL | Encrypted full mobile |
| `mobile_hash` | VARCHAR(128) | NOT NULL UNIQUE | Hash for lookup |
| `dob` | DATE | NOT NULL | Date of birth |
| `status` | VARCHAR(16) | NOT NULL DEFAULT 'active' | User status |
| `account_status` | VARCHAR(16) | NOT NULL DEFAULT 'active' | Account status |
| `biometric_enabled` | BOOLEAN | NOT NULL DEFAULT FALSE | Biometric auth enabled |
| `authenticator_secret_encrypted` | TEXT | | Encrypted TOTP secret |
| `authenticator_enabled` | BOOLEAN | NOT NULL DEFAULT FALSE | TOTP enabled |
| `last_login_at` | TIMESTAMPTZ | | Last login timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_users_mobile_hash` on `mobile_hash` (unique lookup)

**Security Features:**
- Password hashing using bcrypt
- Mobile number encryption and hashing
- TOTP authenticator support
- Device verification

---

### 2. `devices` Table

Tracks user devices for multi-device authentication and biometric support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Device ID |
| `user_id` | BIGINT | REFERENCES auth_users(id) ON DELETE CASCADE | Foreign key to user |
| `uid` | VARCHAR(32) | REFERENCES auth_users(uid) ON DELETE CASCADE | User UID |
| `device_id` | VARCHAR(128) | NOT NULL | Device identifier |
| `device_lookup_hash` | VARCHAR(128) | NOT NULL | Hashed device ID |
| `device_name` | VARCHAR(128) | | Friendly device name |
| `platform` | VARCHAR(16) | NOT NULL CHECK IN ('ios','android','web') | Device platform |
| `app_version` | VARCHAR(32) | | App version |
| `biometric_enabled` | BOOLEAN | NOT NULL DEFAULT FALSE | Biometric auth enabled |
| `biometric_type` | VARCHAR(16) | | 'faceid' or 'fingerprint' |
| `biometric_secret_hash` | VARCHAR(128) | | Hashed biometric secret |
| `is_verified` | BOOLEAN | NOT NULL DEFAULT FALSE | Device verification status |
| `verified_at` | TIMESTAMPTZ | | Verification timestamp |
| `last_seen_at` | TIMESTAMPTZ | | Last activity timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_devices_uid` on `uid`
- `idx_devices_lookup_hash` on `device_lookup_hash`
- `idx_devices_uid_lookup_unique` on `(uid, device_lookup_hash)` (UNIQUE)

**Features:**
- Multi-device support per user
- Biometric authentication (Face ID, Touch ID)
- Device verification flow
- Last seen tracking

---

### 3. `auth_tokens` Table

Manages refresh tokens with rotation support and revocation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | Token ID |
| `user_id` | BIGINT | REFERENCES auth_users(id) ON DELETE CASCADE | Foreign key to user |
| `uid` | VARCHAR(32) | REFERENCES auth_users(uid) ON DELETE CASCADE | User UID |
| `device_id` | VARCHAR(128) | NOT NULL | Device identifier |
| `token_jti` | VARCHAR(64) | NOT NULL UNIQUE | JWT ID (jti claim) |
| `token_hash` | VARCHAR(128) | NOT NULL | Hashed refresh token |
| `token_type` | VARCHAR(16) | NOT NULL DEFAULT 'refresh' | Token type |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Expiration timestamp |
| `revoked_at` | TIMESTAMPTZ | | Revocation timestamp |
| `rotated_from_jti` | VARCHAR(64) | | Previous token JTI |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| `last_used_at` | TIMESTAMPTZ | | Last usage timestamp |

**Indexes:**
- `idx_auth_tokens_uid_device` on `(uid, device_id)`
- `idx_auth_tokens_jti` on `token_jti` (UNIQUE)

**Security Features:**
- Token rotation tracking
- Revocation support
- Usage tracking
- Device-specific tokens

---

## Operator & Profile Schema

### 4. `operator_profiles` Table (Sequelize Model: OperatorProfile)

Public profiles for operators/RJs with social stats and follower counts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `authUid` | STRING(120) | PRIMARY KEY | Auth user UID |
| `displayName` | STRING(120) | DEFAULT '' | Display name |
| `tagline` | STRING(200) | DEFAULT '' | Profile tagline |
| `bio` | TEXT | DEFAULT '' | Biography |
| `location` | STRING(120) | DEFAULT '' | Location |
| `email` | STRING(255) | DEFAULT '' | Email address |
| `avatarUrl` | STRING(500) | DEFAULT '' | Avatar image URL |
| `avatarInitials` | STRING(8) | DEFAULT 'RJ' | Fallback initials |
| `currentMood` | STRING(40) | DEFAULT 'chill' | Current mood/vibe |
| `genres` | JSONB | DEFAULT [] | Array of genres |
| `languages` | JSONB | DEFAULT ['English'] | Array of languages |
| `timezone` | STRING(80) | DEFAULT '' | Timezone |
| `socialLinks` | JSONB | DEFAULT {} | Social media links |
| `podcastFollowers` | INTEGER | DEFAULT 0, MIN 0 | Podcast follower count |
| `rjListeners` | INTEGER | DEFAULT 0, MIN 0 | RJ listener count |
| `rjLikes` | INTEGER | DEFAULT 0, MIN 0 | RJ like count |
| `rjSubscribers` | INTEGER | DEFAULT 0, MIN 0 | RJ subscriber count |
| `rjFollowers` | INTEGER | DEFAULT 0, MIN 0 | RJ follower count |
| `rjShares` | INTEGER | DEFAULT 0, MIN 0 | RJ share count |
| `bestLiveEvents` | JSONB | DEFAULT [] | Best live event highlights |
| `legacyStudioId` | STRING(120) | | Legacy studio ID migration |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_operator_profiles_legacy_studio` on `legacyStudioId`

---

## RJ (Radio Jockey) Studio Schema

### 5. `rj_studios` Table (Sequelize Model: RjStudio)

Main RJ studio configuration with playlist, live status, and real-time controls.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `streamId` | STRING(120) | PRIMARY KEY | Studio/Stream identifier |
| `ownerAuthUid` | STRING(120) | | Owner's auth UID |
| `profileName` | STRING(120) | DEFAULT 'DJ MAVERICK' | Profile name |
| `currentMood` | STRING(40) | DEFAULT 'chill' | Current mood |
| `activeChannel` | INTEGER | DEFAULT 1, MIN 1, MAX 6 | Active audio channel |
| `dualPlayer` | JSONB | NOT NULL DEFAULT {} | Dual player state |
| `mics` | JSONB | NOT NULL DEFAULT [] | Microphone array config |
| `currentTrack` | JSONB | | Currently playing track |
| `isLive` | BOOLEAN | DEFAULT false | Live broadcast status |
| `liveTimerSeconds` | INTEGER | DEFAULT 0, MIN 0 | Live timer in seconds |
| `isTimerPaused` | BOOLEAN | DEFAULT false | Timer pause state |
| `liveTimerStartedAt` | DATE | | Timer start timestamp |
| `isPlaylistActive` | BOOLEAN | DEFAULT false | Playlist active status |
| `isPlaylistPaused` | BOOLEAN | DEFAULT false | Playlist pause state |
| `playlistDuration` | INTEGER | DEFAULT 60, MIN 1, MAX 480 | Playlist duration in minutes |
| `playlistTimerRemaining` | INTEGER | DEFAULT 0, MIN 0 | Remaining playlist time |
| `playlistCurrentIndex` | INTEGER | DEFAULT 0, MIN 0 | Current track index |
| `playlistStartedAt` | DATE | | Playlist start timestamp |
| `playlistTrackStartedAt` | DATE | | Current track start time |
| `playlistTrackElapsedMs` | INTEGER | DEFAULT 0, MIN 0 | Track elapsed milliseconds |
| `playlistSessionLastTickAt` | DATE | | Last tick timestamp |
| `announcement` | JSONB | | Current announcement |
| `stats` | JSONB | NOT NULL DEFAULT {} | Studio statistics |
| `trackStats` | JSONB | NOT NULL DEFAULT {} | Track play statistics |
| `playlistSession` | JSONB | DEFAULT null | Playlist session metadata |
| `listenerHistory` | JSONB | NOT NULL DEFAULT [] | Listener history array |
| `activeListeners` | INTEGER | DEFAULT 0, MIN 0 | Current listener count |
| `operatorProfile` | JSONB | NOT NULL DEFAULT {} | Operator profile snapshot |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

---

### 6. `rj_playlist_items` Table (Sequelize Model: RjPlaylistItem)

Playlist tracks for RJ studios with ordering and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Playlist item ID |
| `streamId` | STRING(120) | NOT NULL | Foreign key to rj_studios |
| `sortOrder` | INTEGER | NOT NULL DEFAULT 0, MIN 0 | Order in playlist |
| `title` | STRING(180) | NOT NULL | Track title |
| `artist` | STRING(120) | DEFAULT 'Unknown' | Artist name |
| `duration` | STRING(20) | DEFAULT '0:00' | Track duration |
| `bpm` | INTEGER | DEFAULT 120, MIN 0, MAX 300 | Beats per minute |
| `source` | ENUM | DEFAULT 'library' | 'library','local','track','custom' |
| `trackId` | UUID | | Reference to track library |
| `localFileId` | UUID | | Reference to local file |
| `metadata` | JSONB | DEFAULT {} | Additional metadata |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_playlist_stream_order` on `(streamId, sortOrder)`
- `idx_playlist_search` on `(streamId, title, artist)`

**Relationships:**
- `belongsTo` RjStudio (Foreign Key: streamId)

---

### 7. `rj_local_files` Table (Sequelize Model: RjLocalFile)

Local audio files uploaded by RJs for their studio.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | File ID |
| `streamId` | STRING(120) | NOT NULL | Foreign key to rj_studios |
| `name` | STRING(255) | NOT NULL | File name |
| `fileUrl` | STRING(500) | NOT NULL | File URL/path |
| `fileSize` | STRING(50) | | Human-readable file size |
| `fileSizeBytes` | INTEGER | | File size in bytes |
| `duration` | STRING(20) | DEFAULT '0:00' | Audio duration |
| `format` | STRING(20) | DEFAULT 'mp3' | Audio format |
| `createdAt` | TIMESTAMPTZ | | Upload timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_local_files_stream` on `(streamId, createdAt)`

**Relationships:**
- `belongsTo` RjStudio (Foreign Key: streamId)

---

### 8. `rj_notifications` Table (Sequelize Model: RjNotification)

Notification system for RJ studio events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Notification ID |
| `streamId` | STRING(120) | NOT NULL | Foreign key to rj_studios |
| `title` | STRING(180) | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification message |
| `type` | ENUM | DEFAULT 'system' | 'system','request','alert' |
| `read` | BOOLEAN | DEFAULT false | Read status |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_notifications_stream` on `(streamId, read, createdAt)`

**Relationships:**
- `belongsTo` RjStudio (Foreign Key: streamId)

---

### 9. `rj_chat_bans` Table (Sequelize Model: RjChatBan)

Chat moderation and ban management for RJ studios.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Ban record ID |
| `streamId` | STRING(120) | NOT NULL | Foreign key to rj_studios |
| `username` | STRING(120) | NOT NULL | Banned username |
| `reason` | STRING(500) | | Ban reason |
| `mode` | ENUM | DEFAULT 'cooldown' | 'cooldown','ban' |
| `cooldownUntil` | DATE | | Cooldown expiry date |
| `createdAt` | TIMESTAMPTZ | | Ban timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_chat_bans_unique` on `(streamId, username)` (UNIQUE)

**Relationships:**
- `belongsTo` RjStudio (Foreign Key: streamId)

---

## Podcast Schema

### 10. `Podcasts` Table (Sequelize Model: Podcast)

Published podcast episodes with metadata and scheduling.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTO INCREMENT | Episode ID |
| `title` | STRING | NOT NULL, LEN 1-180 | Episode title |
| `description` | TEXT | | Episode description |
| `genre` | STRING | LEN 0-80 | Podcast genre |
| `seasonNumber` | INTEGER | MIN 1 | Season number |
| `episodeNumber` | INTEGER | MIN 1 | Episode number |
| `fileName` | STRING | | Original file name |
| `storageKey` | STRING | | Storage key/path |
| `fileUrl` | STRING | | Public file URL |
| `fileSize` | STRING | | Human-readable file size |
| `fileSizeBytes` | INTEGER | MIN 0 | File size in bytes |
| `mimeType` | STRING | LEN 0-120 | MIME type |
| `audioFormat` | STRING | LEN 0-20 | Audio format (mp3, etc.) |
| `duration` | STRING | | Human-readable duration |
| `durationSeconds` | INTEGER | MIN 0 | Duration in seconds |
| `scheduleDate` | STRING | | Scheduled publish date |
| `publishedAt` | DATE | | Actual publish timestamp |
| `status` | ENUM | DEFAULT 'Draft' | 'Published','Draft','Scheduled' |
| `host` | STRING | DEFAULT 'DJ MAVERICK', LEN 0-120 | Host name |
| `coverArt` | STRING | | Cover art URL |
| `source` | ENUM | DEFAULT 'metadata' | 'upload','recording','metadata','trimmed' |
| `trimRanges` | JSONB | | Trim ranges applied |
| `metadata` | JSONB | NOT NULL DEFAULT {} | Additional metadata |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_podcasts_status` on `status`
- `idx_podcasts_host` on `host`
- `idx_podcasts_genre` on `genre`
- `idx_podcasts_season_episode` on `(seasonNumber, episodeNumber)`
- `idx_podcasts_created` on `createdAt`

---

### 11. `PodcastRecordings` Table (Sequelize Model: PodcastRecording)

Raw recording storage before becoming podcast episodes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTO INCREMENT | Recording ID |
| `name` | STRING | NOT NULL, LEN 1-255 | Recording name |
| `duration` | STRING | LEN 0-20 | Human-readable duration |
| `durationSeconds` | INTEGER | MIN 0, MAX 86400 | Duration in seconds |
| `size` | STRING | LEN 0-50 | Human-readable size |
| `fileSizeBytes` | BIGINT | MIN 0 | File size in bytes |
| `storageKey` | STRING | | Storage key/path |
| `fileUrl` | STRING | | Public file URL |
| `mimeType` | STRING | LEN 0-120 | MIME type |
| `source` | ENUM | DEFAULT 'recording' | 'recording','trimmed' |
| `originalRecordingId` | INTEGER | | Parent recording if trimmed |
| `trimRanges` | JSONB | DEFAULT [] | Trim ranges applied |
| `metadata` | JSONB | NOT NULL DEFAULT {} | Additional metadata |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_recordings_source` on `source`
- `idx_recordings_created` on `createdAt`
- `idx_recordings_original` on `originalRecordingId`

---

### 12. `PodcastLiveSessions` Table (Sequelize Model: PodcastLiveSession)

Active live podcast broadcast sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTO INCREMENT | Session ID |
| `title` | STRING | NOT NULL, LEN 1-180 | Session title |
| `description` | TEXT | | Session description |
| `roomId` | STRING | NOT NULL | Short alphanumeric room ID |
| `roomLink` | STRING | | Full shareable URL |
| `host` | STRING | DEFAULT 'Operator', LEN 0-120 | Host name |
| `status` | ENUM | DEFAULT 'live' | 'live','ended' |
| `peakViewers` | INTEGER | DEFAULT 0, MIN 0 | Peak viewer count |
| `lastViewerCount` | INTEGER | DEFAULT 0, MIN 0 | Current/last viewer count |
| `startedAt` | DATE | DEFAULT NOW() | Session start timestamp |
| `endedAt` | DATE | | Session end timestamp |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_live_sessions_status` on `status`
- `idx_live_sessions_room` on `roomId`
- `idx_live_sessions_started` on `startedAt`

---

### 13. `PodcastGuests` Table (Sequelize Model: PodcastGuest)

Guest join requests and slot assignments for live podcast sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTO INCREMENT | Guest record ID |
| `roomId` | STRING | NOT NULL | Foreign key to live session |
| `name` | STRING | NOT NULL, LEN 1-120 | Guest name |
| `device` | STRING | DEFAULT 'Unknown Device', LEN 0-200 | Device description |
| `slotId` | ENUM | | 'mic2','mic3','mic4','mic5' |
| `guestToken` | STRING | | Reconnect token |
| `status` | ENUM | DEFAULT 'pending' | 'pending','approved','denied' |
| `joinedAt` | DATE | DEFAULT NOW() | Join request timestamp |
| `respondedAt` | DATE | | Approval/denial timestamp |
| `micMuted` | BOOLEAN | DEFAULT false | Mic mute state |
| `volume` | INTEGER | DEFAULT 100, MIN 0, MAX 200 | Volume (0-200%) |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_guests_room` on `roomId`
- `idx_guests_status` on `status`
- `idx_guests_room_status` on `(roomId, status)`
- `idx_guests_room_slot` on `(roomId, slotId)`

**Security:**
- RoomId validated as alphanumeric only (prevents SQL injection)

---

### 14. `PodcastMics` Table (Sequelize Model: PodcastMic)

Microphone configuration and state for podcast studio.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTO INCREMENT | Mic ID |
| `name` | STRING | NOT NULL | Mic name |
| `type` | STRING | DEFAULT 'condenser' | Mic type |
| `active` | BOOLEAN | DEFAULT false | Active status |
| `phantom` | BOOLEAN | DEFAULT false | Phantom power enabled |
| `gain` | INTEGER | DEFAULT 0 | Gain level |
| `volume` | INTEGER | DEFAULT 50 | Volume level |
| `muted` | BOOLEAN | DEFAULT true | Mute status |
| `icon` | STRING | DEFAULT 'mic' | Icon identifier |
| `level` | INTEGER | DEFAULT 0 | Current audio level |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

---

### 15. `PodcastNotifications` Table (Sequelize Model: PodcastNotification)

Notification system for podcast studio events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTO INCREMENT | Notification ID |
| `title` | STRING | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification message |
| `type` | STRING | DEFAULT 'system' | Notification type |
| `category` | STRING | DEFAULT 'dashboard' | Category |
| `read` | BOOLEAN | DEFAULT false | Read status |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

---

## Streaming & Activity Schema

### 16. `Streams` Table (Sequelize Model: Stream)

Custom streaming channels with quality settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Stream ID |
| `name` | STRING | NOT NULL UNIQUE, LEN 1-120 | Stream name |
| `description` | STRING | DEFAULT 'Custom Stream Channel', LEN 0-500 | Description |
| `isLive` | BOOLEAN | DEFAULT false | Live status |
| `viewers` | INTEGER | DEFAULT 0, MIN 0 | Current viewers |
| `bitrate` | INTEGER | DEFAULT 128, MIN 32, MAX 320 | Audio bitrate (kbps) |
| `quality` | ENUM | DEFAULT 'BALANCED' | 'MAXIMUM','HIGH','BALANCED','LOSSLESS' |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Relationships:**
- `hasMany` Track (Foreign Key: streamId, ON DELETE CASCADE)

---

### 17. `Tracks` Table (Sequelize Model: Track)

Audio tracks associated with streaming channels.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Track ID |
| `streamId` | UUID | FOREIGN KEY | Foreign key to Streams |
| `title` | STRING | NOT NULL, LEN 1-160 | Track title |
| `artist` | STRING | DEFAULT 'Unknown Artist', LEN 0-120 | Artist name |
| `fileUrl` | STRING | NOT NULL | File URL/path |
| `fileSize` | STRING | | Human-readable file size |
| `duration` | STRING | | Track duration |
| `format` | STRING | | Audio format |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Relationships:**
- `belongsTo` Stream (Foreign Key: streamId)

---

### 18. `ChatMessages` Table (Sequelize Model: ChatMessage)

Live chat messages for studios/streams.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Message ID |
| `studioId` | STRING | NOT NULL, LEN 1-120 | Studio identifier |
| `username` | STRING | NOT NULL, LEN 1-120 | Message author |
| `text` | TEXT | NOT NULL | Message content |
| `type` | ENUM | DEFAULT 'message' | 'message','system' |
| `isPinned` | BOOLEAN | DEFAULT false | Pin status |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_chat_studio_time` on `(studioId, createdAt)`
- `idx_chat_pinned` on `(studioId, isPinned)`

---

### 19. `SongRequests` Table (Sequelize Model: SongRequest)

Song request system with voting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Request ID |
| `studioId` | STRING | NOT NULL, LEN 1-120 | Studio identifier |
| `username` | STRING | NOT NULL, LEN 1-120 | Requester username |
| `songTitle` | STRING | NOT NULL, LEN 1-180 | Requested song title |
| `votes` | INTEGER | DEFAULT 1, MIN 0 | Vote count |
| `status` | ENUM | DEFAULT 'pending' | 'pending','accepted','rejected','played' |
| `votedBy` | JSONB | DEFAULT [] | Array of voters |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_requests_studio_status` on `(studioId, status)`
- `idx_requests_votes` on `(studioId, votes)`

---

### 20. `StreamReactions` Table (Sequelize Model: StreamReaction)

Real-time reactions (likes, gifts, stickers) during streams.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Reaction ID |
| `studioId` | STRING | NOT NULL, LEN 1-120 | Studio identifier |
| `username` | STRING | NOT NULL, LEN 1-120 | User who reacted |
| `type` | ENUM | NOT NULL | 'like','gift','sticker' |
| `value` | JSONB | | Reaction metadata |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_reactions_type` on `(studioId, type)`
- `idx_reactions_time` on `(studioId, createdAt)`

---

### 21. `LiveSessions` Table (Sequelize Model: LiveSession)

Tracking live streaming sessions with viewer metrics (RJ Studio).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | Session ID |
| `streamId` | STRING | NOT NULL, LEN 1-120 | Stream identifier |
| `streamName` | STRING | NOT NULL, LEN 1-180 | Stream name |
| `startedAt` | DATE | NOT NULL DEFAULT NOW() | Session start time |
| `endedAt` | DATE | | Session end time |
| `peakViewers` | INTEGER | DEFAULT 0, MIN 0 | Peak viewer count |
| `lastViewerCount` | INTEGER | DEFAULT 0, MIN 0 | Last viewer count |
| `status` | ENUM | DEFAULT 'live' | 'live','ended' |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

**Indexes:**
- `idx_sessions_stream_status` on `(streamId, status)`
- `idx_sessions_started` on `startedAt`

---

### 22. `Users` Table (Sequelize Model: User)

Application-level user profiles (separate from auth_users).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY DEFAULT UUIDV4 | User ID |
| `authUid` | STRING | UNIQUE | Link to auth_users.uid |
| `name` | STRING | NOT NULL, LEN 1-120 | Display name |
| `email` | STRING | UNIQUE, isEmail | Email address |
| `avatar` | STRING | DEFAULT 'U', LEN 1-8 | Avatar initials |
| `role` | ENUM | DEFAULT 'Listener' | 'RJ','Podcast Host','Listener' |
| `followers` | INTEGER | DEFAULT 0, MIN 0 | Follower count |
| `isBanned` | BOOLEAN | DEFAULT false | Ban status |
| `reports` | INTEGER | DEFAULT 0, MIN 0 | Report count |
| `joinDate` | DATEONLY | DEFAULT NOW() | Join date |
| `bio` | TEXT | | User biography |
| `location` | STRING | LEN 0-200 | Location |
| `createdAt` | TIMESTAMPTZ | | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | | Last update timestamp |

---

## Database Configuration

### Connection Configuration

**File:** `melodymeet-backend/services/operator/config/db.config.js`

```javascript
{
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  pool: {
    max: process.env.DB_POOL_MAX || 10,
    min: process.env.DB_POOL_MIN || 0,
    acquire: process.env.DB_POOL_ACQUIRE || 30000,
    idle: process.env.DB_POOL_IDLE || 10000,
  }
}
```

### Database Systems

1. **PostgreSQL Raw Queries** (Auth System)
   - Located in: `auth/models/*.model.js`
   - Connection: `auth/db.js`
   - Schema: `auth/sql/auth.schema.sql`

2. **Sequelize ORM** (Application Data)
   - Located in: `models/*.model.js`
   - Connection: `config/db.config.js`
   - Auto-sync: Models define schema programmatically

---

## Indexes & Relationships

### Primary Relationships

**RJ Studio System:**
```
RjStudio (1) ──< (N) RjPlaylistItem
RjStudio (1) ──< (N) RjLocalFile
RjStudio (1) ──< (N) RjNotification
RjStudio (1) ──< (N) RjChatBan
```

**Streaming System:**
```
Stream (1) ──< (N) Track [CASCADE DELETE]
```

**Authentication System:**
```
auth_users (1) ──< (N) devices [CASCADE DELETE]
auth_users (1) ──< (N) auth_tokens [CASCADE DELETE]
```

**Podcast System:**
```
PodcastLiveSession (1) ──< (N) PodcastGuest (via roomId)
PodcastRecording (1) ──< (N) PodcastRecording (via originalRecordingId)
```

### Key Indexes

**Performance-Critical Indexes:**
- `auth_users.mobile_hash` - UNIQUE, for login lookup
- `devices.(uid, device_lookup_hash)` - UNIQUE composite
- `auth_tokens.token_jti` - UNIQUE, for token validation
- `rj_playlist_items.(streamId, sortOrder)` - for playlist ordering
- `rj_chat_bans.(streamId, username)` - UNIQUE, for ban checks
- `ChatMessages.(studioId, createdAt)` - for message history
- `SongRequests.(studioId, status)` - for filtering requests

---

## Security Features

### Authentication
- **Password Hashing:** bcrypt with salt
- **Mobile Number Encryption:** AES encryption + SHA-256 hashing
- **Token Security:** JWT with refresh token rotation
- **Device Fingerprinting:** Hashed device IDs
- **Biometric Support:** Face ID / Touch ID
- **TOTP/2FA:** Authenticator app support

### Data Protection
- **Encrypted Fields:** 
  - `mobile_encrypted`
  - `authenticator_secret_encrypted`
- **Hashed Fields:**
  - `password_hash`
  - `mobile_hash`
  - `device_lookup_hash`
  - `token_hash`

### SQL Injection Prevention
- All queries use parameterized statements (`$1, $2, ...`)
- Input validation using Joi schemas
- Alphanumeric-only validation for `roomId` and similar fields

---

## Data Types Summary

### Common JSONB Fields

| Field | Purpose | Example Structure |
|-------|---------|-------------------|
| `dualPlayer` | Dual deck player state | `{ deck1: {...}, deck2: {...} }` |
| `mics` | Microphone array config | `[{ id: 1, muted: false, ... }]` |
| `currentTrack` | Currently playing track | `{ title, artist, duration, ... }` |
| `stats` | Studio statistics | `{ totalPlays, totalListeners, ... }` |
| `trackStats` | Per-track statistics | `{ "trackId": { playCount, lastPlayedAt } }` |
| `genres` | Array of genres | `["Rock", "Pop", "Jazz"]` |
| `socialLinks` | Social media URLs | `{ twitter, instagram, facebook }` |
| `trimRanges` | Audio trim ranges | `[{ start: 0, end: 30 }]` |
| `metadata` | Additional metadata | `{ custom: "data" }` |
| `votedBy` | Array of voter usernames | `["user1", "user2"]` |

### ENUM Types

| ENUM Name | Values | Usage |
|-----------|--------|-------|
| Platform | `ios`, `android`, `web` | Device platform |
| BiometricType | `faceid`, `fingerprint` | Biometric method |
| MessageType | `message`, `system` | Chat message type |
| RequestStatus | `pending`, `accepted`, `rejected`, `played` | Song request status |
| ReactionType | `like`, `gift`, `sticker` | Stream reaction type |
| SessionStatus | `live`, `ended` | Broadcast session status |
| PodcastStatus | `Published`, `Draft`, `Scheduled` | Podcast publish status |
| PodcastSource | `upload`, `recording`, `metadata`, `trimmed` | Source of podcast |
| RecordingSource | `recording`, `trimmed` | Source of recording |
| GuestStatus | `pending`, `approved`, `denied` | Guest approval status |
| MicSlot | `mic2`, `mic3`, `mic4`, `mic5` | Guest mic slot |
| UserRole | `RJ`, `Podcast Host`, `Listener` | User role |
| StreamQuality | `MAXIMUM`, `HIGH`, `BALANCED`, `LOSSLESS` | Audio quality |
| PlaylistSource | `library`, `local`, `track`, `custom` | Playlist item source |
| NotificationType | `system`, `request`, `alert` | Notification type |
| BanMode | `cooldown`, `ban` | Chat ban mode |

---

## Migration Scripts

### Authentication Schema Migration

**File:** `auth/sql/auth.schema.sql`

Creates the authentication schema with:
- PostgreSQL crypto extension
- User sequence for UID generation
- Three core tables: `auth_users`, `devices`, `auth_tokens`
- Indexes for performance
- ALTER TABLE statements for backward compatibility

**Run Migration:**
```bash
cd melodymeet-backend/services/operator/auth
node migrate.js
```

### Sequelize Auto-Sync

Sequelize models automatically create/update tables on server start when `sync()` is called.

**Sync Options:**
- `{ force: true }` - DROP and recreate (destructive)
- `{ alter: true }` - Alter existing schema (safer)
- No options - Create if not exists (production)

---

## Table Statistics

| Schema | Tables | Purpose |
|--------|--------|---------|
| Authentication | 3 | User auth, devices, tokens |
| Operator Profile | 1 | Public operator profiles |
| RJ Studio | 5 | Radio jockey features |
| Podcast | 6 | Podcast management & live |
| Streaming | 2 | Custom streams & tracks |
| Activity | 4 | Chat, requests, reactions, sessions |
| Users | 1 | Application user profiles |
| **TOTAL** | **22 Tables** | |

---

## Future Considerations

### Potential Improvements

1. **Normalization Opportunities**
   - Extract `genres` into a separate table with many-to-many relationships
   - Create a shared `media_files` table for podcasts, recordings, and tracks
   - Centralize user profiles (merge `Users` and `operator_profiles`)

2. **Performance Optimization**
   - Add materialized views for analytics queries
   - Implement partitioning for chat messages by date
   - Add full-text search indexes for podcast titles/descriptions
   - Consider Redis caching for live viewer counts

3. **Data Integrity**
   - Add foreign key constraints between Sequelize models and auth tables
   - Implement soft deletes for critical data (podcasts, recordings)
   - Add CHECK constraints for JSONB field structures
   - Implement audit logging for sensitive operations

4. **Scalability**
   - Consider sharding strategy for high-traffic studios
   - Implement read replicas for analytics queries
   - Move real-time data (reactions, viewer counts) to Redis
   - Archive old chat messages and sessions to separate tables

5. **Monitoring**
   - Add table size monitoring
   - Track slow query patterns
   - Monitor connection pool usage
   - Set up alerts for failed transactions

---

## Schema Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION SYSTEM                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  auth_users  │───<│   devices    │    │ auth_tokens  │     │
│  │  (uid, id)   │    │  (uid, dev)  │───<│  (uid, jti)  │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      RJ STUDIO SYSTEM                            │
│  ┌──────────────┐                                                │
│  │  RjStudio    │───< RjPlaylistItem                            │
│  │ (streamId)   │───< RjLocalFile                               │
│  │              │───< RjNotification                            │
│  └──────────────┘───< RjChatBan                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PODCAST SYSTEM                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │    Podcast     │  │PodcastRecording│  │PodcastLiveSession│  │
│  │  (episodes)    │  │  (raw audio)   │  │   (roomId)       │  │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                    │             │
│                                           ┌────────┴─────┐      │
│                                           │PodcastGuest  │      │
│                                           │  (joinReq)   │      │
│                                           └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    STREAMING & ACTIVITY                          │
│  ┌────────────┐                  ┌──────────────┐              │
│  │  Stream    │───< Track        │ ChatMessage  │              │
│  │ (streamId) │                  │ SongRequest  │              │
│  └────────────┘                  │StreamReaction│              │
│                                   │ LiveSession  │              │
│                                   └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PROFILE SYSTEM                              │
│  ┌──────────────────┐         ┌────────────────┐               │
│  │OperatorProfile   │         │     Users      │               │
│  │   (authUid)      │         │  (authUid FK)  │               │
│  └──────────────────┘         └────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Most Frequently Accessed Tables
1. `auth_users` - Every login
2. `auth_tokens` - Every API request
3. `devices` - Every login/device verification
4. `RjStudio` - RJ panel operations
5. `ChatMessages` - Real-time chat
6. `PodcastLiveSession` - Live broadcasts

### Largest Tables (Estimated)
1. `ChatMessages` - High write volume
2. `StreamReactions` - Real-time reactions
3. `SongRequests` - User-generated content
4. `auth_tokens` - Token accumulation
5. `PodcastRecordings` - Large file metadata

### Most Complex Tables
1. `RjStudio` - 30+ columns, multiple JSONB fields
2. `OperatorProfile` - Rich profile data
3. `Podcast` - Comprehensive episode metadata
4. `PodcastGuest` - Guest flow management
5. `RjPlaylistItem` - Playlist orchestration

---

**End of Database Schema Documentation**
