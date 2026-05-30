const express = require('express');
const ctrl = require('../controllers/downloadController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Logged-in customers only.
router.use(authenticate);

router.get('/', ctrl.listCategories);                 // list download categories
router.get('/:slug', ctrl.browseCategory);            // browse a category (?path=sub)
router.get('/:slug/file', ctrl.downloadFile);         // stream a file (?path=sub)

module.exports = router;
