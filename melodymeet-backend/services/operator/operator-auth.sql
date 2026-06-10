CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP INDEX IF EXISTS idx_users_username_unique;

CREATE SEQUENCE IF NOT EXISTS users_uid_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS auth_users (
  uid VARCHAR(32) PRIMARY KEY DEFAULT nextval('users_uid_seq')::TEXT,
  id BIGSERIAL UNIQUE NOT NULL,
  username VARCHAR(32),
  password_hash TEXT NOT NULL,
  mobile_number_encrypted TEXT,
  mobile_number_hash VARCHAR(128),
  mobile_encrypted TEXT NOT NULL,
  mobile_hash VARCHAR(128) NOT NULL UNIQUE,
  dob DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  account_status VARCHAR(16) NOT NULL DEFAULT 'active',
  biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  authenticator_secret_encrypted TEXT,
  authenticator_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES auth_users(id) ON DELETE CASCADE,
  uid VARCHAR(32) REFERENCES auth_users(uid) ON DELETE CASCADE,
  device_id VARCHAR(128) NOT NULL,
  device_lookup_hash VARCHAR(128) NOT NULL,
  device_name VARCHAR(128),
  platform VARCHAR(16) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version VARCHAR(32),
  biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  biometric_type VARCHAR(16),
  biometric_secret_hash VARCHAR(128),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (uid, device_lookup_hash)
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES auth_users(id) ON DELETE CASCADE,
  uid VARCHAR(32) REFERENCES auth_users(uid) ON DELETE CASCADE,
  device_id VARCHAR(128) NOT NULL,
  token_jti VARCHAR(64) NOT NULL UNIQUE,
  token_hash VARCHAR(128) NOT NULL,
  token_type VARCHAR(16) NOT NULL DEFAULT 'refresh',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  rotated_from_jti VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_mobile_hash ON auth_users(mobile_hash);
CREATE INDEX IF NOT EXISTS idx_devices_uid ON devices(uid);
CREATE INDEX IF NOT EXISTS idx_devices_lookup_hash ON devices(device_lookup_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_uid_lookup_unique ON devices(uid, device_lookup_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_uid_device ON auth_tokens(uid, device_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_jti ON auth_tokens(token_jti);

ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mobile_number_encrypted TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mobile_number_hash VARCHAR(128);
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mobile_encrypted TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS mobile_hash VARCHAR(128);
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS authenticator_secret_encrypted TEXT;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS authenticator_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE auth_users ALTER COLUMN uid SET DEFAULT nextval('users_uid_seq')::TEXT;

SELECT setval(
  'users_uid_seq',
  GREATEST(
    COALESCE((SELECT MAX(uid::BIGINT) FROM auth_users WHERE uid ~ '^[0-9]+$'), 0),
    0
  ) + 1,
  false
);

ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_lookup_hash VARCHAR(128);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(128);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS platform VARCHAR(16);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS app_version VARCHAR(32);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS biometric_type VARCHAR(16);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS biometric_secret_hash VARCHAR(128);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS device_id VARCHAR(128);
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS token_jti VARCHAR(64);
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS token_hash VARCHAR(128);
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS token_type VARCHAR(16) NOT NULL DEFAULT 'refresh';
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS rotated_from_jti VARCHAR(64);
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
