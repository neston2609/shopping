const { forbidden } = require('../utils/http');

// Role-based access control. Usage: requireRole('admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) return next(forbidden('Access denied'));
    if (!roles.includes(req.user.role.name)) return next(forbidden('Insufficient permissions'));
    return next();
  };
}

module.exports = { requireRole };
