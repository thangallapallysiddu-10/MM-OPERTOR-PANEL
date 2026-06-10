// Socket.IO authentication middleware

const jwt = require('jsonwebtoken');
const { config } = require('../auth/config');

/**
 * Socket authentication middleware
 * Verifies JWT token from socket handshake data
 */
function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, config.jwtAccessSecret);
    
    if (decoded.type !== 'access') {
      return next(new Error('Invalid token type'));
    }

    // Attach user info to socket for later use
    socket.data.authUser = decoded;
    socket.data.userId = decoded.sub || decoded.userId;
    socket.data.uid = decoded.uid;
    
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    next(new Error(message));
  }
}

/**
 * Optional authentication - allows unauthenticated connections but provides auth data if token present
 */
function socketOptionalAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, config.jwtAccessSecret);
      if (decoded.type === 'access') {
        socket.data.authUser = decoded;
        socket.data.userId = decoded.sub || decoded.userId;
        socket.data.uid = decoded.uid;
      }
    }
    
    next();
  } catch (err) {
    // Optional auth - don't fail, just skip auth data
    next();
  }
}

module.exports = { socketAuthMiddleware, socketOptionalAuthMiddleware };
