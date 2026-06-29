const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { getSettlement } = require('../controllers/settlementController');

router.get('/:groupId', protect, getSettlement);

module.exports = router;