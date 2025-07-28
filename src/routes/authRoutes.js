const express = require('express');
const router = express.Router();
const authController = require('../services/auth');
const {auth} = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', auth, authController.changePassword);

module.exports = router;
