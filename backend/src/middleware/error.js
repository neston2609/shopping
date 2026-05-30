const { ApiError } = require('../utils/http');

function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  // If the response has already started (e.g. a file stream was mid-flight),
  // we can't send JSON — just destroy the socket and let Express clean up.
  // Premature-close during a download is normal when the client cancels.
  if (res.headersSent || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
    if (!res.writableEnded) try { res.destroy(); } catch (e) { /* */ }
    return next(err);
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that unique value already exists', field: err.meta?.target });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }

  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const status = err.status || 500;
  return res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
}

module.exports = { notFoundHandler, errorHandler };
