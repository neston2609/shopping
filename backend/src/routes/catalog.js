const express = require('express');
const products = require('../controllers/productController');
const categories = require('../controllers/categoryController');

const router = express.Router();

// Products
router.get('/products', products.list);
router.get('/products/featured', products.featured);
router.get('/products/:slug', products.getBySlug);

// Categories
router.get('/categories', categories.list);

module.exports = router;
