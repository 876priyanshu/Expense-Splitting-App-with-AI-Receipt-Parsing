const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const { generateSettlement } = require('../services/settlementEngine');
const bcrypt = require('bcryptjs');
const { explainSettlement, generateSpendingInsights, categorizeExpense } = require('../services/aiService');

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

    res.redirect(`/dashboard?userId=${user._id}`);
  } catch (err) {
    res.render('login', { error: 'Something went wrong' });
  }
});

router.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.render('signup', { error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });

    res.redirect('/login');
  } catch (err) {
    res.render('signup', { error: 'Something went wrong' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.redirect('/login');

    const groups = await Group.find({ members: userId }).populate('members', 'name email');
    res.render('dashboard', { groups, userId, error: null });
  } catch (err) {
    res.send('Error loading dashboard: ' + err.message);
  }
});

router.post('/dashboard/create-group', async (req, res) => {
  try {
    const { name, userId } = req.body;
    await Group.create({ name, members: [userId], createdBy: userId });
    res.redirect(`/dashboard?userId=${userId}`);
  } catch (err) {
    res.send('Error creating group: ' + err.message);
  }
});

router.get('/settlement/:groupId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members', 'name email');
    if (!group) return res.send('Group not found');

    const expenses = await Expense.find({ group: req.params.groupId });
    const { balances, transactions } = generateSettlement(expenses, group.members.map(m => m._id));

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

    const expensesWithDetails = expenses.map(e => ({
      description: e.description,
      amount: e.amount,
      category: e.category,
      paidBy: memberMap[e.paidBy.toString()] || 'Unknown',
    }));

    const aiSummary = await explainSettlement(transactionsWithNames, group.name);
    const spendingInsights = await generateSpendingInsights(expenses, group.name);

    res.render('settlement', {
      groupName: group.name,
      groupId: req.params.groupId,
      members: group.members,
      balances: balancesWithNames,
      transactions: transactionsWithNames,
      aiSummary,
      spendingInsights,
      expenses: expensesWithDetails,
    });
  } catch (err) {
    res.send('Error loading settlement: ' + err.message);
  }
});

router.post('/settlement/:groupId/add-member', async (req, res) => {
  try {
    const { email } = req.body;
    const group = await Group.findById(req.params.groupId);

    const userToAdd = await User.findOne({ email });
    if (userToAdd && !group.members.some(m => m.toString() === userToAdd._id.toString())) {
      group.members.push(userToAdd._id);
      await group.save();
    }

    res.redirect(`/settlement/${req.params.groupId}`);
  } catch (err) {
    res.send('Error adding member: ' + err.message);
  }
});

router.post('/settlement/:groupId/add-expense', async (req, res) => {
  try {
    const { amount, description, paidBy } = req.body;
    const group = await Group.findById(req.params.groupId);

    const category = await categorizeExpense(description);

    await Expense.create({
      group: req.params.groupId,
      paidBy,
      amount: Number(amount),
      description,
      splitAmong: group.members,
      category,
    });

    res.redirect(`/settlement/${req.params.groupId}`);
  } catch (err) {
    res.send('Error adding expense: ' + err.message);
  }
});

module.exports = router;