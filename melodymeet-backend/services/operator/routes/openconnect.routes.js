const express = require('express');
const router = express.Router();
const openConnectController = require('../controllers/openconnect.controller');
const { authenticate } = require('../auth/middleware');

// Apply Operator authentication middleware to all OpenConnect integration routes
router.use(authenticate);

router.get('/health', openConnectController.getHealth);
router.get('/users', openConnectController.getUsers);
router.get('/rjs', openConnectController.getRjs);
router.get('/stations', openConnectController.getStations);
router.get('/podcasts', openConnectController.getPodcasts);
router.get('/reports', openConnectController.getReports);

module.exports = router;
