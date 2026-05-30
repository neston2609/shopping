const express = require('express');
const ctrl = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validate(ctrl.registerSchema), ctrl.register);
router.post('/login', validate(ctrl.loginSchema), ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.patch('/profile', authenticate, validate(ctrl.profileSchema), ctrl.updateProfile);
router.patch('/credentials', authenticate, validate(ctrl.credentialsSchema), ctrl.updateCredentials);

module.exports = router;
