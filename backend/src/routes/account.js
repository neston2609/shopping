const express = require('express');
const orders = require('../controllers/orderController');
const addresses = require('../controllers/addressController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// All account routes require a logged-in customer.
router.use(authenticate);

// Orders
router.get('/orders', orders.myOrders);
router.get('/orders/:orderNumber', orders.myOrderDetail);

// Shipping addresses
router.get('/addresses', addresses.list);
router.post('/addresses', validate(addresses.addressSchema), addresses.create);
router.patch('/addresses/:id', validate(addresses.addressSchema.partial()), addresses.update);
router.delete('/addresses/:id', addresses.remove);

module.exports = router;
