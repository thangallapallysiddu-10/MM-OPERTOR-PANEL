const express = require('express');
const {
  signup,
  login,
  verifyAuthenticatorCode,
  enableBiometrics,
  refreshTokens,
  logout,
} = require('../services/auth.service');

const router = express.Router();

function asyncRoute(handler) {
  return async (req, res, next) => {
    console.log(`[AUTH] ${req.method} ${req.originalUrl} body:`, JSON.stringify(req.body).slice(0, 200));
    try {
      const data = await handler(req.body, req);
      console.log(`[AUTH] ${req.originalUrl} => SUCCESS`);
      res.json({ success: true, ...data });
    } catch (error) {
      console.error(`[AUTH] ${req.originalUrl} => ERROR:`, error.message);
      next(error);
    }
  };
}

router.post('/signup', asyncRoute(signup));
router.post('/login', asyncRoute(login));
router.post('/verify-authenticator', asyncRoute(verifyAuthenticatorCode));
router.post('/biometrics/enable', asyncRoute(enableBiometrics));
router.post('/refresh', asyncRoute(refreshTokens));
router.post('/logout', asyncRoute(logout));

module.exports = router;
