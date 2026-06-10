// JWT access-token middleware for protecting operator routes.
// Verifies the access token issued by the auth service.

const jwt = require('jsonwebtoken');
const { config } = require('./config');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret);
    if (decoded.type !== 'access') {
      return res.status(401).json({ success: false, error: 'Invalid token type' });
    }
    req.authUser = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    return res.status(401).json({ success: false, error: message });
  }
}

module.exports = { authenticate };
