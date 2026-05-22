const express = require('express');
const ctrl = require('../controllers/checkoutController');
const { validate } = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.use(optionalAuth);

router.post('/totals', ctrl.calculateTotals);
router.post('/', validate(ctrl.placeOrderSchema), ctrl.placeOrder);

module.exports = router;
