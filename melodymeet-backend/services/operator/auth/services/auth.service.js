const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { decryptText } = require('./crypto.service');
const { issueTokens, verifyRefreshToken } = require('./token.service');
const AppUser = require('../../models/user.model');
const {
  createUser,
  findUserByMobile,
  findUserByUid,
  markAuthenticatorEnabled,
  mobileExists,
  passwordMatches,
  publicUser,
  touchLastLogin,
} = require('../models/user.model');
const {
  enableBiometricsForDevice,
  findDevice,
  markDeviceVerified,
  publicDevice,
  upsertDevice,
} = require('../models/device.model');
const {
  findRefreshToken,
  revokeDeviceTokens,
  revokeRefreshToken,
  touchRefreshToken,
} = require('../models/token.model');

function requireFields(body, fields) {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

function normalizePlatform(platform) {
  const normalized = String(platform || '').toLowerCase();
  if (['ios', 'android', 'web'].includes(normalized)) return normalized;
  return 'android';
}

function assertValidMobileNumber(countryCode, mobileNumber) {
  const normalizedMobile = String(mobileNumber || '').trim();
  if (countryCode === '+91' && !/^\d{10}$/.test(normalizedMobile)) {
    const error = new Error('Please enter exactly 10 digits for +91 mobile number');
    error.status = 400;
    throw error;
  }
  if (normalizedMobile.length < 10) {
    const error = new Error('Please enter a valid mobile number');
    error.status = 400;
    throw error;
  }
}

function assertValidSignup(body) {
  requireFields(body, ['name', 'mobileNumber', 'countryCode', 'dob', 'password', 'deviceId']);
  assertValidMobileNumber(body.countryCode, body.mobileNumber);
  if (String(body.password).length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.status = 400;
    throw error;
  }
}

async function signup(body) {
  assertValidSignup(body);
  const platform = normalizePlatform(body.platform);

  if (await mobileExists(body.countryCode, body.mobileNumber)) {
    const error = new Error('Mobile number already registered');
    error.status = 409;
    throw error;
  }

  const authenticatorSecret = speakeasy.generateSecret({
    name: `MelodyMeet:${body.countryCode}${body.mobileNumber}`,
    issuer: 'MelodyMeet',
    length: 20,
  });

  const user = await createUser({
    username: body.name,
    countryCode: body.countryCode,
    mobileNumber: body.mobileNumber,
    dob: body.dob,
    password: body.password,
    authenticatorSecret: authenticatorSecret.base32,
  });

  // Create public profile linked to this auth identity
  try {
    await AppUser.create({
      authUid: user.uid,
      name: body.name,
      role: 'Listener', // default role
    });
  } catch (profileErr) {
    console.warn('Could not create public profile (may already exist):', profileErr.message);
  }

  const device = await upsertDevice({
    userId: user.id,
    uid: user.uid,
    deviceId: body.deviceId,
    deviceName: body.deviceName,
    platform,
    appVersion: body.appVersion,
    isVerified: platform !== 'web',
  });

  const otpauthUrl = authenticatorSecret.otpauth_url;
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return {
    user: publicUser(user),
    device: publicDevice(device),
    authenticator: {
      required: true,
      verified: false,
      secret: authenticatorSecret.base32,
      otpauthUrl,
      qrCodeDataUrl,
    },
  };
}

async function login(body) {
  requireFields(body, ['mobileNumber', 'countryCode', 'deviceId']);
  assertValidMobileNumber(body.countryCode, body.mobileNumber);

  const user = await findUserByMobile(body.countryCode, body.mobileNumber);
  
  // SECURITY: Always require password verification - never trust client's biometricVerified flag
  if (!user || !passwordMatches(body.password, user)) {
    const error = new Error('Invalid mobile number or password');
    error.status = 401;
    throw error;
  }

  const platform = normalizePlatform(body.platform);
  const device = await upsertDevice({
    userId: user.id,
    uid: user.uid,
    deviceId: body.deviceId,
    deviceName: body.deviceName,
    platform,
    appVersion: body.appVersion,
    isVerified: false,
  });

  // For web platform, require authenticator (2FA)
  if (platform === 'web') {
    return {
      requiresAuthenticator: true,
      requiresBiometric: false,
      requiresBiometricSetup: false,
      uid: user.uid,
      device: publicDevice(device),
    };
  }

  // For mobile platforms (iOS/Android), check biometric status
  if (!device.biometric_enabled) {
    // Biometric not set up yet - prompt user to set it up
    return {
      requiresAuthenticator: false,
      requiresBiometric: false,
      requiresBiometricSetup: true,
      uid: user.uid,
      device: publicDevice(device),
    };
  }

  // Biometric is enabled - verify the device
  await markDeviceVerified(user.uid, body.deviceId);
  await touchLastLogin(user.uid);
  const tokens = await issueTokens({ user, deviceId: body.deviceId });

  return {
    requiresAuthenticator: false,
    requiresBiometric: false,
    requiresBiometricSetup: false,
    uid: user.uid,
    user: publicUser(user),
    device: publicDevice({ ...device, is_verified: true }),
    tokens,
  };
}

async function verifyAuthenticatorCode(body) {
  requireFields(body, ['uid', 'deviceId', 'code']);

  const user = await findUserByUid(body.uid);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const secret = decryptText(user.authenticator_secret_encrypted);
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(body.code),
    window: 1,
  });

  if (!isValid) {
    const error = new Error('Invalid authenticator code');
    error.status = 401;
    throw error;
  }

  await markAuthenticatorEnabled(user.uid);
  const device = await markDeviceVerified(user.uid, body.deviceId);
  await touchLastLogin(user.uid);
  const tokens = await issueTokens({ user, deviceId: body.deviceId });

  return {
    user: publicUser({ ...user, authenticator_enabled: true, last_login_at: new Date() }),
    device: publicDevice(device),
    tokens,
  };
}

async function enableBiometrics(body) {
  requireFields(body, ['uid', 'deviceId', 'biometricType']);

  const device = await findDevice(body.uid, body.deviceId);
  if (!device || !device.is_verified) {
    const error = new Error('Device must be verified before enabling biometrics');
    error.status = 403;
    throw error;
  }

  const updatedDevice = await enableBiometricsForDevice({
    uid: body.uid,
    deviceId: body.deviceId,
    biometricType: body.biometricType,
    appSecret: body.appSecret,
  });

  return {
    device: publicDevice(updatedDevice),
  };
}

async function refreshTokens(body) {
  requireFields(body, ['refreshToken']);

  const decoded = verifyRefreshToken(body.refreshToken);
  const stored = await findRefreshToken(decoded.jti, body.refreshToken);
  if (!stored || stored.revoked_at || new Date(stored.expires_at) <= new Date()) {
    const error = new Error('Invalid refresh token');
    error.status = 401;
    throw error;
  }

  const user = await findUserByUid(decoded.uid);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  await touchRefreshToken(decoded.jti);
  await revokeRefreshToken(decoded.jti);
  const tokens = await issueTokens({
    user,
    deviceId: decoded.deviceId,
    rotatedFromJti: decoded.jti,
  });

  return {
    user: publicUser(user),
    tokens,
  };
}

async function logout(body) {
  requireFields(body, ['uid', 'deviceId']);
  await revokeDeviceTokens(body.uid, body.deviceId);
  return { success: true };
}

module.exports = {
  signup,
  login,
  verifyAuthenticatorCode,
  enableBiometrics,
  refreshTokens,
  logout,
};
