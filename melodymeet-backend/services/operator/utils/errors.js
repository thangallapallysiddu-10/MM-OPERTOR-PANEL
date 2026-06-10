class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

const badRequest = (message) => new HttpError(400, message);
const notFound = (message) => new HttpError(404, message);

const getStatusCode = (error, fallbackStatus = 500) => {
  if (error.statusCode) return error.statusCode;
  if (error.name === 'SequelizeValidationError') return 400;
  if (error.name === 'SequelizeUniqueConstraintError') return 409;
  if (error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') return 413;
  if (error.name === 'MulterError') return 400;
  return fallbackStatus;
};

const sendError = (res, error, fallbackStatus = 500) => {
  const statusCode = getStatusCode(error, fallbackStatus);
  const message = error.message || 'Request failed';
  return res.status(statusCode).json({ success: false, error: message });
};

module.exports = { HttpError, badRequest, notFound, sendError };
