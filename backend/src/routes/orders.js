const express = require('express');
const orders = require('../controllers/orderController');
const { slipUpload } = require('../lib/upload');

const router = express.Router();

// Public lookup by (unguessable) order number — powers the order-confirmation page.
router.get('/lookup/:orderNumber', orders.publicLookup);

// Customer uploads a bank-transfer payment slip (multipart field "slip").
router.post('/:orderNumber/slip', slipUpload.single('slip'), orders.uploadSlip);

module.exports = router;
