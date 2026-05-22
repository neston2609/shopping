const express = require('express');
const ctrl = require('../controllers/storeConfigController');

const router = express.Router();

router.get('/shipping-methods', ctrl.shippingMethods);
router.get('/payment-methods', ctrl.paymentMethods);

module.exports = router;
