const { query } = require('../db');
const { encryptText, hashMobile, hashPassword, verifyPassword } = require('../services/crypto.service');

async function createUser({ username, countryCode, mobileNumber, dob, password, authenticatorSecret }) {
  const fullMobile = `${countryCode}${mobileNumber}`;
  const mobileHash = hashMobile(countryCode, mobileNumber);
  const mobileEncrypted = encryptText(fullMobile);

  const result = await query(
    `INSERT INTO auth_users (
      username,
      password_hash,
      mobile_number_encrypted,
      mobile_number_hash,
      mobile_encrypted,
      mobile_hash,
      dob,
      authenticator_secret_encrypted
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING uid, id, username, dob, status, account_status, biometric_enabled,
      authenticator_enabled, created_at`,
    [
      username,
      hashPassword(password),
      mobileEncrypted,
      mobileHash,
      mobileEncrypted,
      mobileHash,
      dob,
      encryptText(authenticatorSecret),
    ]
  );

  return result.rows[0];
}

async function findUserByMobile(countryCode, mobileNumber) {
  const mobileHash = hashMobile(countryCode, mobileNumber);
  const result = await query(
    `SELECT * FROM auth_users WHERE mobile_hash = $1 LIMIT 1`,
    [mobileHash]
  );
  return result.rows[0] || null;
}

async function findUserByUid(uid) {
  const result = await query(`SELECT * FROM auth_users WHERE uid = $1 LIMIT 1`, [uid]);
  return result.rows[0] || null;
}

async function mobileExists(countryCode, mobileNumber) {
  return Boolean(await findUserByMobile(countryCode, mobileNumber));
}

function passwordMatches(password, user) {
  return verifyPassword(password, user.password_hash);
}

async function markAuthenticatorEnabled(uid) {
  const result = await query(
    `UPDATE auth_users
     SET authenticator_enabled = TRUE, updated_at = NOW()
     WHERE uid = $1
     RETURNING uid, username, dob, status, account_status, biometric_enabled,
      authenticator_enabled, created_at, updated_at`,
    [uid]
  );
  return result.rows[0] || null;
}

async function touchLastLogin(uid) {
  await query(`UPDATE auth_users SET last_login_at = NOW(), updated_at = NOW() WHERE uid = $1`, [uid]);
}

function publicUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    id: String(user.id || ''),
    name: user.username,
    dob: user.dob,
    status: user.status,
    accountStatus: user.account_status,
    biometricEnabled: Boolean(user.biometric_enabled),
    authenticatorEnabled: Boolean(user.authenticator_enabled),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}

module.exports = {
  createUser,
  findUserByMobile,
  findUserByUid,
  mobileExists,
  passwordMatches,
  markAuthenticatorEnabled,
  touchLastLogin,
  publicUser,
};
