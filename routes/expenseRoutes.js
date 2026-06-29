const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { addExpense, getGroupExpenses } = require('../controllers/expenseController');

router.post('/', protect, addExpense);
router.get('/:groupId', protect, getGroupExpenses);

module.exports = router;