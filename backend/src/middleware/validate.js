const { badRequest } = require('../utils/http');

// Validates req[part] against a zod schema; replaces it with parsed data.
function validate(schema, part = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(badRequest('Validation failed', details));
    }
    req[part] = result.data;
    return next();
  };
}

module.exports = { validate };
