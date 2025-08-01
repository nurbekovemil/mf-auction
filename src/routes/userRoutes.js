const express = require('express');
const router = express.Router();
const userService = require('../services/user');
const {auth} = require('../middlewares/authMiddleware');

router.get('/list', auth, userService.list);
router.put('/:id/update', auth, userService.updateUserInfo);
router.put('/:id/verify', auth, userService.updateVerify);

module.exports = router;
