const express = require('express');
const ctrl = require('../controllers/cartController');
const { validate } = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Cart works for both guests (cookie token) and logged-in users.
router.use(optionalAuth);

router.get('/', ctrl.getCart);
router.post('/items', validate(ctrl.addSchema), ctrl.addItem);
router.patch('/items/:itemId', validate(ctrl.updateSchema), ctrl.updateItem);
router.delete('/items/:itemId', ctrl.removeItem);

module.exports = router;
