# Operator Profile API

Base URL: `/api/profile`  
Auth: `Authorization: Bearer <access_token>` on all routes.

Profiles are stored in the `operator_profiles` table (one row per operator `authUid`).  
Legacy data in `rj_studios` (`op-profile-*`) is migrated automatically on first access.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get your profile |
| GET | `/me/dashboard` | Profile + metrics, podcasts, top live events |
| PUT | `/me` | **Save** full profile (requires `displayName`) |
| PATCH | `/me` | **Update** partial fields |
| POST | `/me/avatar` | Multipart field `avatar` — image upload (JPG, PNG, WEBP, GIF) |

### PUT `/me` body (save / create)

```json
{
  "displayName": "DJ MAVERICK",
  "tagline": "Your vibe",
  "bio": "About the show",
  "location": "Hyderabad",
  "email": "rj@example.com",
  "avatarUrl": "/uploads/cover-xxx.jpg",
  "avatarInitials": "DJ",
  "currentMood": "chill",
  "genres": ["EDM", "Bollywood"],
  "languages": ["English", "Hindi"],
  "timezone": "Asia/Kolkata",
  "socialLinks": {
    "instagram": "https://instagram.com/...",
    "youtube": "",
    "twitter": "",
    "spotify": "",
    "website": "",
    "facebook": ""
  },
  "podcastFollowers": 1200
}
```

### PATCH `/me`

Same fields as PUT; all optional; at least one field required.

### Response shape

```json
{
  "success": true,
  "data": {
    "authUid": "abc123",
    "streamId": "op-profile-abc123",
    "profileName": "DJ MAVERICK",
    "currentMood": "chill",
    "isLive": false,
    "stats": {
      "listeners": 0,
      "likes": 0,
      "subscribers": 0,
      "followers": 0,
      "shares": 0
    },
    "operatorProfile": { ... },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Dashboard adds `metrics`, `bestLiveEvents`, `recentPodcasts`.

---

## Legacy RJ routes

`/api/rj/me/profile*` still works and delegates to this service.
