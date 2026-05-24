const express = require('express');
const ctrl = require('../controllers/downloadController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Logged-in customers only.
router.use(authenticate);

router.get('/', ctrl.browse);
router.get('/file', ctrl.download);

module.exports = router;
