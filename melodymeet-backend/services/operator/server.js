const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
require('dotenv').config();

// Validate environment configuration before starting
const { validateEnvironment } = require('./config/env.validator');
validateEnvironment();

const sequelize = require('./config/db.config');
const { sendError } = require('./utils/errors');
const { authenticate } = require('./auth/middleware');
const { uploadLimiter, authLimiter, apiLimiter } = require('./middleware/rate-limit.middleware');

require('./models/stream.model');
require('./models/podcast.model');
require('./models/user.model');
require('./models/activity.model');
require('./models/podcast.recording.model');
require('./models/podcast.live.model');
require('./models/podcast.guest.model');
require('./models/podcast.mic.model');
require('./models/podcast.notification.model');
require('./models/rj.model');
require('./models/operator.profile.model');

const { query: authQuery } = require('./auth/db');
const streamSocket = require('./sockets/stream.socket');
const chatSocket = require('./sockets/chat.socket');
const podcastSocket = require('./sockets/podcast.socket');
const rjSocket = require('./sockets/rj.socket');
const streamRoutes = require('./routes/stream.routes');
const podcastRoutes = require('./routes/podcast.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const rjRoutes = require('./routes/rj.routes');
const operatorProfileRoutes = require('./routes/operator.profile.routes');
const authRoutes = require('./auth/routes/auth.routes');

const app = express();
const server = http.createServer(app);

// CORS configuration - must be explicitly set, never '*' in production
const defaultDevCorsOrigin = 'http://localhost:3000,http://localhost:5173,http://localhost:8081';
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : defaultDevCorsOrigin);
if (!corsOrigin) {
  console.error('ERROR: CORS_ORIGIN environment variable not set');
  process.exit(1);
}

const io = new Server(server, {
  cors: {
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

const runAuthMigration = async () => {
  try {
    const schemaPath = path.resolve(__dirname, 'auth', 'sql', 'auth.schema.sql');
    if (!fs.existsSync(schemaPath)) return;

    const schema = fs.readFileSync(schemaPath, 'utf8');
    await authQuery(schema);
    console.log('Auth database schema applied successfully');
  } catch (err) {
    console.warn('Auth migration warning:', err.message);
  }
};

app.use(cors({ origin: corsOrigin.split(',').map((o) => o.trim()), credentials: true }));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Profile/cover images use opaque filenames — public GET so <img> tags work without Bearer headers.
// Audio uploads (audio-*) still require authentication.
const uploadsDir = path.join(__dirname, 'uploads');
const serveUploads = express.static(uploadsDir, {
  dotfiles: 'deny',
  index: false,
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (/\.(jpe?g|png|gif|webp)$/i.test(filePath)) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  },
});

const isPublicUploadFile = (reqPath) => {
  const fileName = path.basename(decodeURIComponent(reqPath || ''));
  return /\.(jpe?g|png|gif|webp|avif|jfif|bmp|heic|heif|mp3|wav|m4a|aac|ogg|webm)$/i.test(fileName);
};

app.use('/uploads', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (isPublicUploadFile(req.path)) {
    return serveUploads(req, res, next);
  }
  return authenticate(req, res, () => serveUploads(req, res, next));
});

// Apply API rate limiting
app.use('/api/', apiLimiter);

// Authentication rate limiting
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify-authenticator', authLimiter);
app.use('/api/auth/biometrics/enable', authLimiter);

// File upload rate limiting for specific endpoints
app.post('/api/podcasts/upload', uploadLimiter);
app.post('/api/streams/:streamId/tracks', uploadLimiter);
app.post('/api/rj/:studioId/local-files', uploadLimiter);
app.post('/api/profile/me/avatar', uploadLimiter);
app.post('/api/podcasts/recordings/upload', uploadLimiter);

app.use('/api/streams', streamRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/rj', rjRoutes);
app.use('/api/profile', operatorProfileRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MelodyMeet Operator Service is running',
    services: {
      podcasts: 'GET /api/podcasts',
      podcastUpload: 'POST /api/podcasts/upload',
      streams: 'GET /api/streams',
      analytics: 'GET /api/analytics/dashboard',
      rjStudio: 'GET /api/rj/:studioId',
      operatorProfile: 'GET /api/profile/me',
    },
    auth: {
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      verifyAuthenticator: 'POST /api/auth/verify-authenticator',
      enableBiometrics: 'POST /api/auth/biometrics/enable',
      refresh: 'POST /api/auth/refresh',
      logout: 'POST /api/auth/logout',
    },
  });
});

streamSocket(io);
chatSocket(io);
podcastSocket(io);
rjSocket(io);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (err.status) {
    return res.status(err.status).json({ success: false, error: err.message });
  }

  return sendError(res, err);
});

const PORT = process.env.PORT || 5000;
const syncOptions = { alter: process.env.DB_SYNC_ALTER !== 'false' };

sequelize.authenticate()
  .then(() => sequelize.sync(syncOptions))
  .then(() => {
    console.log('PostgreSQL database synced successfully (Sequelize)');
    return runAuthMigration();
  })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`MelodyMeet Operator Service running on http://localhost:${PORT}`);
      console.log('WebSocket namespaces: /stream | /chat | /podcast | /rj');
      console.log('Auth endpoints available at /api/auth/*');
    });
  })
  .catch((err) => {
    console.error('Database sync failed:', err.message);
    process.exit(1);
  });
