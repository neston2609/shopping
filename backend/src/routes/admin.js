const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');

const products = require('../controllers/admin/adminProductController');
const categories = require('../controllers/admin/adminCategoryController');
const orders = require('../controllers/admin/adminOrderController');
const customers = require('../controllers/admin/adminCustomerController');
const shipping = require('../controllers/admin/adminShippingController');
const payments = require('../controllers/admin/adminPaymentController');
const smtp = require('../controllers/admin/adminSmtpController');
const templates = require('../controllers/admin/adminTemplateController');
const misc = require('../controllers/admin/adminMiscController');

const router = express.Router();

// Every admin route requires authentication + admin role.
router.use(authenticate, requireRole('admin'));

// Dashboard
router.get('/stats', misc.stats);
router.get('/email-logs', misc.emailLogs);

// Products
router.get('/products', products.list);
router.post('/products', validate(products.upsertSchema), products.create);
router.get('/products/:id', products.getOne);
router.put('/products/:id', validate(products.upsertSchema), products.update);
router.delete('/products/:id', products.remove);

// Categories
router.get('/categories', categories.list);
router.post('/categories', validate(categories.upsertSchema), categories.create);
router.put('/categories/:id', validate(categories.upsertSchema), categories.update);
router.delete('/categories/:id', categories.remove);

// Orders
router.get('/orders', orders.list);
router.get('/orders/:id', orders.getOne);
router.patch('/orders/:id/status', validate(orders.statusSchema), orders.updateStatus);
router.patch('/orders/:id/tracking', validate(orders.trackingSchema), orders.setTracking);
router.patch('/orders/:id/payment', validate(orders.paymentSchema), orders.updatePayment);

// Customers
router.get('/customers', customers.list);
router.get('/customers/:id', customers.getOne);

// Shipping methods
router.get('/shipping', shipping.list);
router.post('/shipping', validate(shipping.upsertSchema), shipping.create);
router.put('/shipping/:id', validate(shipping.upsertSchema), shipping.update);
router.delete('/shipping/:id', shipping.remove);

// Payment method config
router.get('/payments', payments.list);
router.put('/payments/:method', validate(payments.updateSchema), payments.update);

// SMTP settings
router.get('/smtp', smtp.get);
router.put('/smtp', validate(smtp.updateSchema), smtp.update);
router.post('/smtp/test-connection', smtp.testConnection);
router.post('/smtp/test-email', validate(smtp.testSchema), smtp.sendTestEmail);

// Email templates
router.get('/templates', templates.list);
router.get('/templates/:key', templates.getOne);
router.put('/templates/:key', validate(templates.updateSchema), templates.update);
router.post('/templates/:key/preview', templates.preview);

module.exports = router;
