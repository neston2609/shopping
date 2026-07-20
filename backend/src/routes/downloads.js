const express = require('express');
const ctrl = require('../controllers/downloadController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public: anyone can browse and download. optionalAuth still attaches req.user
// when a token is present, so download logging can record the user if known.
router.use(optionalAuth);

router.get('/', ctrl.listCategories);                 // list download categories
router.get('/:slug', ctrl.browseCategory);            // browse a category (?path=sub)
router.get('/:slug/file', ctrl.downloadFile);         // stream a file (?path=sub)
router.get('/:slug/thumb', ctrl.thumbnail);            // folder thumbnail (folder.jpg)

module.exports = router;
