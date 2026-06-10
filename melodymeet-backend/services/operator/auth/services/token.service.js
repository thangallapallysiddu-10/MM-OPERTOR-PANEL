const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { randomId } = require('./crypto.service');
const { storeRefreshToken } = require('../models/token.model');

async function issueTokens({ user, deviceId, rotatedFromJti }) {
  const accessToken = jwt.sign(
    {
      sub: user.uid,
      uid: user.uid,
      deviceId,
      type: 'access',
    },
    config.jwtAccessSecret,
    { expiresIn: '4h' }   // 4 hours — sufficient for a live broadcast session
  );

  const refreshJti = randomId(16);
  const refreshToken = jwt.sign(
    {
      sub: user.uid,
      uid: user.uid,
      deviceId,
      jti: refreshJti,
      type: 'refresh',
    },
    config.jwtRefreshSecret,
    { expiresIn: `${config.refreshTokenDays}d` }
  );

  const expiresAt = new Date(Date.now() + config.refreshTokenDays * 24 * 60 * 60 * 1000);
  await storeRefreshToken({
    userId: user.id,
    uid: user.uid,
    deviceId,
    tokenJti: refreshJti,
    refreshToken,
    expiresAt,
    rotatedFromJti,
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenJti: refreshJti,
    expiresAt,
  };
}

function verifyRefreshToken(refreshToken) {
  return jwt.verify(refreshToken, config.jwtRefreshSecret);
}

module.exports = { issueTokens, verifyRefreshToken };
