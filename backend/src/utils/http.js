// Wrap async route handlers so thrown errors hit the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const notFound = (msg = 'Resource not found') => new ApiError(404, msg);
const badRequest = (msg = 'Bad request', details) => new ApiError(400, msg, details);
const unauthorized = (msg = 'Unauthorized') => new ApiError(401, msg);
const forbidden = (msg = 'Forbidden') => new ApiError(403, msg);
const conflict = (msg = 'Conflict') => new ApiError(409, msg);

module.exports = { asyncHandler, ApiError, notFound, badRequest, unauthorized, forbidden, conflict };
