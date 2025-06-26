const express = require('express');
const router = express.Router();
const userService = require('../services/user');
const {auth} = require('../middlewares/authMiddleware');

router.get('/list', auth, userService.list);
router.put('/:id/update', auth, userService.update);

module.exports = router;
