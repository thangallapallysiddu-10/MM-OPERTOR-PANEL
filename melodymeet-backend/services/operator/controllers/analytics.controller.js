const analyticsService = require('../services/analytics.service');
const { sendError } = require('../utils/errors');

const getDashboardStats = async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    sendError(res, err);
  }
};

const getStreamAnalytics = async (req, res) => {
  try {
    const data = await analyticsService.getStreamAnalytics(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    sendError(res, err, 404);
  }
};

module.exports = { getDashboardStats, getStreamAnalytics };
