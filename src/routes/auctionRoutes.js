const express = require('express');
const router = express.Router();
const auctionService = require('../services/auction');
const {auth} = require('../middlewares/authMiddleware');

router.get('/:id', auth, auctionService.report);

module.exports = router;
