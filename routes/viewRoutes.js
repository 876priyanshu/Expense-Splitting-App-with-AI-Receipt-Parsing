const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const { generateSettlement } = require('../services/settlementEngine');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
console.log('viewRoutes.js was loaded!');
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.render('login', { error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.render('login', { error: 'Invalid credentials' });

    // For demo purposes, just redirect to a hardcoded group's settlement page
    const group = await Group.findOne({ members: user._id });
    if (!group) return res.render('login', { error: 'No groups found for this user' });

    res.redirect(`/settlement/${group._id}`);
  } catch (err) {
    res.render('login', { error: 'Something went wrong' });
  }
});

router.get('/settlement/:groupId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members', 'name email');
    if (!group) return res.send('Group not found');

    const expenses = await Expense.find({ group: req.params.groupId });
    const { balances, transactions } = generateSettlement(expenses, group.members.map(m => m._id));

    // Map balances and transactions to include names instead of just IDs
    const memberMap = {};
    group.members.forEach(m => { memberMap[m._id.toString()] = m.name; });

    const balancesWithNames = Object.entries(balances).map(([id, balance]) => ({
      name: memberMap[id] || 'Unknown',
      balance: Math.round(balance * 100) / 100,
    }));

    const transactionsWithNames = transactions.map(t => ({
      fromName: memberMap[t.from] || 'Unknown',
      toName: memberMap[t.to] || 'Unknown',
      amount: t.amount,
    }));

    res.render('settlement', {
      groupName: group.name,
      balances: balancesWithNames,
      transactions: transactionsWithNames,
    });
  } catch (err) {
    res.send('Error loading settlement: ' + err.message);
  }
});

module.exports = router;