// Auth-specific configuration
// Reads from the same .env as the main operator service

const config = {
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  authEncryptionKey: process.env.AUTH_ENCRYPTION_KEY || 'dev-encryption-secret-change-me',
  mobileHashSecret: process.env.MOBILE_HASH_SECRET || 'dev-mobile-hash-secret',
  deviceHashSecret: process.env.DEVICE_HASH_SECRET || 'dev-device-hash-secret',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
};

module.exports = { config };
