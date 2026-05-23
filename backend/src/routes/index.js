const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'retroconsole-api', time: new Date().toISOString() }));

router.use('/auth', require('./auth'));
router.use('/', require('./catalog')); // /products, /categories
router.use('/', require('./storeConfig')); // /shipping-methods, /payment-methods
router.use('/cart', require('./cart'));
router.use('/checkout', require('./checkout'));
router.use('/orders', require('./orders'));
router.use('/account', require('./account'));
router.use('/admin', require('./admin'));

module.exports = router;
