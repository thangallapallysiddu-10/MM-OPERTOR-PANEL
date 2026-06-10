const { query } = require('../db');
const { hashDeviceId, hashValue } = require('../services/crypto.service');
const { config } = require('../config');

function normalizeBiometricType(type) {
  const normalized = String(type || '').toLowerCase().replace(/[\s_-]/g, '');
  if (['face', 'faceid', 'facial', 'facialrecognition'].includes(normalized)) return 'faceid';
  if (['finger', 'fingerprint', 'touchid'].includes(normalized)) return 'fingerprint';
  return 'fingerprint';
}

async function upsertDevice({
  userId,
  uid,
  deviceId,
  deviceName,
  platform,
  appVersion,
  isVerified = false,
}) {
  const deviceLookupHash = hashDeviceId(deviceId);
  const result = await query(
    `INSERT INTO devices (
      user_id,
      uid,
      device_id,
      device_lookup_hash,
      device_name,
      platform,
      app_version,
      is_verified,
      verified_at,
      last_seen_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $8 THEN NOW() ELSE NULL END,NOW())
    ON CONFLICT (uid, device_lookup_hash)
    DO UPDATE SET
      device_name = EXCLUDED.device_name,
      platform = EXCLUDED.platform,
      app_version = EXCLUDED.app_version,
      is_verified = devices.is_verified OR EXCLUDED.is_verified,
      verified_at = CASE
        WHEN devices.verified_at IS NULL AND EXCLUDED.is_verified THEN NOW()
        ELSE devices.verified_at
      END,
      last_seen_at = NOW(),
      updated_at = NOW()
    RETURNING *`,
    [userId, uid, deviceId, deviceLookupHash, deviceName || null, platform, appVersion || null, isVerified]
  );
  return result.rows[0];
}

async function findDevice(uid, deviceId) {
  const result = await query(
    `SELECT * FROM devices WHERE uid = $1 AND device_lookup_hash = $2 LIMIT 1`,
    [uid, hashDeviceId(deviceId)]
  );
  return result.rows[0] || null;
}

async function markDeviceVerified(uid, deviceId) {
  const result = await query(
    `UPDATE devices
     SET is_verified = TRUE, verified_at = COALESCE(verified_at, NOW()), last_seen_at = NOW(), updated_at = NOW()
     WHERE uid = $1 AND device_lookup_hash = $2
     RETURNING *`,
    [uid, hashDeviceId(deviceId)]
  );
  return result.rows[0] || null;
}

async function enableBiometricsForDevice({ uid, deviceId, biometricType, appSecret }) {
  const result = await query(
    `UPDATE devices
     SET biometric_enabled = TRUE,
      biometric_type = $3,
      biometric_secret_hash = $4,
      updated_at = NOW()
     WHERE uid = $1 AND device_lookup_hash = $2
     RETURNING *`,
    [
      uid,
      hashDeviceId(deviceId),
      normalizeBiometricType(biometricType),
      appSecret ? hashValue(appSecret, config.deviceHashSecret) : null,
    ]
  );
  return result.rows[0] || null;
}

function publicDevice(device) {
  if (!device) return null;
  return {
    id: String(device.id),
    uid: device.uid,
    deviceId: device.device_id,
    deviceName: device.device_name,
    platform: device.platform,
    appVersion: device.app_version,
    biometricEnabled: Boolean(device.biometric_enabled),
    biometricType: device.biometric_type,
    isVerified: Boolean(device.is_verified),
    verifiedAt: device.verified_at,
    lastSeenAt: device.last_seen_at,
  };
}

module.exports = {
  upsertDevice,
  findDevice,
  markDeviceVerified,
  enableBiometricsForDevice,
  publicDevice,
};
