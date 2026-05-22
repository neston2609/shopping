const { verifyToken } = require('../lib/token');
const prisma = require('../lib/prisma');
const { unauthorized } = require('../utils/http');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

// Requires a valid token; attaches req.user.
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw unauthorized('Authentication required');
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
    if (!user || !user.isActive) throw unauthorized('Invalid session');
    req.user = user;
    next();
  } catch (err) {
    if (err.status) return next(err);
    return next(unauthorized('Invalid or expired token'));
  }
}

// Attaches req.user if a valid token is present, but never blocks.
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (user && user.isActive) req.user = user;
  } catch (e) {
    // ignore — treated as guest
  }
  return next();
}

module.exports = { authenticate, optionalAuth, extractToken };
