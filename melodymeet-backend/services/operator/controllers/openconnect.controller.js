const openConnectService = require('../services/openConnectService');

async function getHealth(req, res, next) {
  try {
    const health = await openConnectService.getHealthStatus();
    return res.json({
      success: true,
      data: health,
    });
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const result = await openConnectService.getUsers(req.query);
    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        error: result.error || 'Failed to fetch OpenConnect users',
      });
    }
    return res.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
}

async function getRjs(req, res, next) {
  try {
    const result = await openConnectService.getRjs(req.query);
    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        error: result.error || 'Failed to fetch OpenConnect RJs',
      });
    }
    return res.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
}

async function getStations(req, res, next) {
  try {
    const result = await openConnectService.getStations(req.query);
    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        error: result.error || 'Failed to fetch OpenConnect stations',
      });
    }
    return res.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
}

async function getPodcasts(req, res, next) {
  try {
    const result = await openConnectService.getPodcasts(req.query);
    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        error: result.error || 'Failed to fetch OpenConnect podcasts',
      });
    }
    return res.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
}

async function getReports(req, res, next) {
  try {
    const result = await openConnectService.getReports(req.query);
    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        error: result.error || 'Failed to fetch OpenConnect reports',
      });
    }
    return res.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHealth,
  getUsers,
  getRjs,
  getStations,
  getPodcasts,
  getReports,
};
