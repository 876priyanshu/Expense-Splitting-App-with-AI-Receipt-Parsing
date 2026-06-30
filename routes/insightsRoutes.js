const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { getGroupInsights } = require('../controllers/insightsController');

router.get('/:groupId', protect, getGroupInsights);

module.exports = router;