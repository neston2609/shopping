const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'retroconsole-api', time: new Date().toISOString() }));

router.use('/auth', require('./auth'));
router.use('/', require('./catalog')); // /products, /categories
router.use('/', require('./storeConfig')); // /shipping-methods, /payment-methods
router.use('/cart', require('./cart'));
router.use('/checkout', require('./checkout'));
router.use('/orders', require('./orders'));
router.use('/downloads', require('./downloads'));

// Discount validate (optionally auth — works for guests too)
const { optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const discountCtrl = require('../controllers/discountController');
router.post('/discount/validate', optionalAuth, validate(discountCtrl.validateSchema), discountCtrl.validate);

// OAuth callback for OneDrive / Google Drive — browser redirect, no auth header.
// Authenticated via signed state token.
const adminSourcesCtrl = require('../controllers/admin/adminSourceController');
router.get('/sources/oauth/callback', adminSourcesCtrl.oauthCallback);
router.use('/account', require('./account'));
router.use('/admin', require('./admin'));

module.exports = router;
