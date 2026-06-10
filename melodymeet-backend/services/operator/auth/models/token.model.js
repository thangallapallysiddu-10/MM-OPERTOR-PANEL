const { query } = require('../db');
const { hashToken } = require('../services/crypto.service');

async function storeRefreshToken({
  userId,
  uid,
  deviceId,
  tokenJti,
  refreshToken,
  expiresAt,
  rotatedFromJti,
}) {
  const result = await query(
    `INSERT INTO auth_tokens (
      user_id,
      uid,
      device_id,
      token_jti,
      token_hash,
      token_type,
      expires_at,
      rotated_from_jti
    )
    VALUES ($1,$2,$3,$4,$5,'refresh',$6,$7)
    RETURNING *`,
    [userId, uid, deviceId, tokenJti, hashToken(refreshToken), expiresAt, rotatedFromJti || null]
  );
  return result.rows[0];
}

async function findRefreshToken(tokenJti, refreshToken) {
  const result = await query(
    `SELECT * FROM auth_tokens
     WHERE token_jti = $1 AND token_hash = $2 AND token_type = 'refresh'
     LIMIT 1`,
    [tokenJti, hashToken(refreshToken)]
  );
  return result.rows[0] || null;
}

async function touchRefreshToken(tokenJti) {
  await query(`UPDATE auth_tokens SET last_used_at = NOW() WHERE token_jti = $1`, [tokenJti]);
}

async function revokeRefreshToken(tokenJti) {
  await query(
    `UPDATE auth_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_jti = $1`,
    [tokenJti]
  );
}

async function revokeDeviceTokens(uid, deviceId) {
  await query(
    `UPDATE auth_tokens
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE uid = $1 AND device_id = $2 AND revoked_at IS NULL`,
    [uid, deviceId]
  );
}

module.exports = {
  storeRefreshToken,
  findRefreshToken,
  touchRefreshToken,
  revokeRefreshToken,
  revokeDeviceTokens,
};
