/**
 * OpenConnect Integration Service
 * Manages communication between Operator Backend and OpenConnect Backend.
 */
const jwt = require('jsonwebtoken');

function getOpenConnectConfig() {
  const baseUrl = (process.env.OPENCONNECT_BACKEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const jwtSecret = process.env.OPENCONNECT_JWT_SECRET || 'replace-with-at-least-32-random-characters';
  return { baseUrl, jwtSecret };
}

/**
 * Generate a secure service-to-service admin JWT token for OpenConnect API calls.
 */
function generateSystemToken() {
  const { jwtSecret } = getOpenConnectConfig();
  return jwt.sign(
    {
      sub: 'operator-system-service',
      email: 'operator@melodymeet.system',
      role: 'admin',
    },
    jwtSecret,
    { expiresIn: '1h' }
  );
}

/**
 * Helper to make HTTP requests to OpenConnect Backend with timeout and error handling.
 */
async function fetchFromOpenConnect(endpoint, options = {}) {
  const { baseUrl } = getOpenConnectConfig();
  const url = `${baseUrl}${endpoint}`;
  const token = generateSystemToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data?.error?.message || data?.message || `OpenConnect responded with status ${response.status}`,
      };
    }

    return {
      success: true,
      status: response.status,
      data: data?.data !== undefined ? data.data : data,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      status: isTimeout ? 504 : 503,
      error: isTimeout
        ? 'OpenConnect Backend request timed out'
        : `OpenConnect Backend unavailable: ${err.message}`,
    };
  }
}

/**
 * Check health status of OpenConnect Backend (database, redis, overall).
 */
async function getHealthStatus() {
  const { baseUrl } = getOpenConnectConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();
    return {
      success: response.ok,
      connected: response.ok,
      details: data,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      success: false,
      connected: false,
      error: err.name === 'AbortError' ? 'Health check timed out' : err.message,
    };
  }
}

/**
 * Get OpenConnect Users catalog / list.
 */
async function getUsers(queryParams = {}) {
  const searchParams = new URLSearchParams(queryParams).toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  return fetchFromOpenConnect(`/api/v1/users${queryString}`);
}

/**
 * Get OpenConnect RJs (Radio Jockeys).
 */
async function getRjs(queryParams = {}) {
  const searchParams = new URLSearchParams(queryParams).toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  return fetchFromOpenConnect(`/api/v1/rjs${queryString}`);
}

/**
 * Get OpenConnect Radio Stations.
 */
async function getStations(queryParams = {}) {
  const searchParams = new URLSearchParams(queryParams).toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  return fetchFromOpenConnect(`/api/v1/stations${queryString}`);
}

/**
 * Get OpenConnect Podcasts.
 */
async function getPodcasts(queryParams = {}) {
  const searchParams = new URLSearchParams(queryParams).toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  return fetchFromOpenConnect(`/api/v1/podcasts${queryString}`);
}

/**
 * Get OpenConnect Content Moderation Reports.
 */
async function getReports(queryParams = {}) {
  const searchParams = new URLSearchParams(queryParams).toString();
  const queryString = searchParams ? `?${searchParams}` : '';
  return fetchFromOpenConnect(`/api/v1/reports${queryString}`);
}

module.exports = {
  getHealthStatus,
  getUsers,
  getRjs,
  getStations,
  getPodcasts,
  getReports,
};
