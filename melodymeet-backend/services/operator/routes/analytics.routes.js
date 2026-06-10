// routes/analytics.routes.js
const express = require('express');
const { authenticate } = require('../auth/middleware');
const router = express.Router();
const { getDashboardStats, getStreamAnalytics } = require('../controllers/analytics.controller');

// Apply authentication middleware to all analytics routes
router.use(authenticate);

// GET /api/analytics/dashboard
router.get('/dashboard', getDashboardStats);

// GET /api/analytics/streams/:id
router.get('/streams/:id', getStreamAnalytics);

module.exports = router;
