const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { qrUpload, categoryImageUpload, productImageUpload } = require('../lib/upload');
const dlCategories = require('../controllers/admin/adminDownloadCategoryController');
const hideRules = require('../controllers/admin/adminHideRuleController');
const discounts = require('../controllers/admin/adminDiscountController');

const products = require('../controllers/admin/adminProductController');
const categories = require('../controllers/admin/adminCategoryController');
const orders = require('../controllers/admin/adminOrderController');
const customers = require('../controllers/admin/adminCustomerController');
const shipping = require('../controllers/admin/adminShippingController');
const payments = require('../controllers/admin/adminPaymentController');
const smtp = require('../controllers/admin/adminSmtpController');
const templates = require('../controllers/admin/adminTemplateController');
const misc = require('../controllers/admin/adminMiscController');
const sftp = require('../controllers/admin/adminSftpController');

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
router.post('/products/:id/images', productImageUpload.single('image'), products.uploadImage);
router.delete('/products/:id/images/:imageId', products.removeImage);

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
router.patch('/orders/:id/approve-payment', orders.approvePayment);

// Customers
router.get('/customers', customers.list);
router.get('/customers/:id', customers.getOne);
router.delete('/customers/:id', customers.remove);

// Discount codes
router.get('/discounts', discounts.list);
router.post('/discounts', validate(discounts.upsertSchema), discounts.create);
router.put('/discounts/:id', validate(discounts.upsertSchema), discounts.update);
router.delete('/discounts/:id', discounts.remove);

// Shipping methods
router.get('/shipping', shipping.list);
router.post('/shipping', validate(shipping.upsertSchema), shipping.create);
router.put('/shipping/:id', validate(shipping.upsertSchema), shipping.update);
router.delete('/shipping/:id', shipping.remove);
// Shipping promo (free-shipping threshold)
router.get('/shipping-promo', shipping.getPromo);
router.put('/shipping-promo', validate(shipping.promoSchema), shipping.updatePromo);

// Payment method config
router.get('/payments', payments.list);
router.put('/payments/:method', validate(payments.updateSchema), payments.update);
router.post('/payments/:method/qr', qrUpload.single('qr'), payments.uploadQr);

// SMTP settings
router.get('/smtp', smtp.get);
router.put('/smtp', validate(smtp.updateSchema), smtp.update);
router.post('/smtp/test-connection', smtp.testConnection);
router.post('/smtp/test-email', validate(smtp.testSchema), smtp.sendTestEmail);

// SFTP downloads config
router.get('/sftp', sftp.get);
router.put('/sftp', validate(sftp.updateSchema), sftp.update);
router.post('/sftp/test', sftp.test);
router.get('/sftp/browse', sftp.browse);
router.get('/downloads/logs', sftp.listLogs);
router.get('/download-categories', dlCategories.list);
router.post('/download-categories', validate(dlCategories.upsertSchema), dlCategories.create);
router.put('/download-categories/:id', validate(dlCategories.upsertSchema), dlCategories.update);
router.delete('/download-categories/:id', dlCategories.remove);
router.post('/download-categories/:id/image', categoryImageUpload.single('image'), dlCategories.uploadImage);
router.get('/download-hide-rules', hideRules.list);
router.post('/download-hide-rules', validate(hideRules.upsertSchema), hideRules.create);
router.put('/download-hide-rules/:id', validate(hideRules.upsertSchema), hideRules.update);
router.delete('/download-hide-rules/:id', hideRules.remove);

// Email templates
router.get('/templates', templates.list);
router.get('/templates/:key', templates.getOne);
router.put('/templates/:key', validate(templates.updateSchema), templates.update);
router.post('/templates/:key/preview', templates.preview);

module.exports = router;
