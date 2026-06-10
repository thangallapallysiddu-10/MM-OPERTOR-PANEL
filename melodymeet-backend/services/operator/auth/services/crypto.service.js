const crypto = require('crypto');
const { config } = require('../config');

function keyFromSecret(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

function hashValue(value, secret) {
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
}

function hashMobile(countryCode, mobileNumber) {
  const normalized = `${countryCode}${mobileNumber}`.replace(/\s+/g, '');
  return hashValue(normalized, config.mobileHashSecret);
}

function hashDeviceId(deviceId) {
  return hashValue(deviceId, config.deviceHashSecret);
}

function encryptText(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromSecret(config.authEncryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptText(payload) {
  const [ivText, tagText, encryptedText] = String(payload).split('.');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    keyFromSecret(config.authEncryptionKey),
    Buffer.from(ivText, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, passwordHash) {
  const [method, salt, stored] = String(passwordHash).split('$');
  if (method !== 'scrypt' || !salt || !stored) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(stored, 'hex'), derived);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  hashValue,
  hashMobile,
  hashDeviceId,
  encryptText,
  decryptText,
  hashPassword,
  verifyPassword,
  hashToken,
  randomId,
};
