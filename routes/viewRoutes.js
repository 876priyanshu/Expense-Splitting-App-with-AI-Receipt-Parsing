const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const { generateSettlement } = require('../services/settlementEngine');
const bcrypt = require('bcryptjs');
const { explainSettlement, generateSpendingInsights, categorizeExpense } = require('../services/aiService');
const axios = require('axios');
const { logActivity } = require('../services/activityLogger');
const { getCachedSettlement, invalidateSettlementCache } = require('../services/settlementCache');

router.post('/settlement/:groupId/remove-member', async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.send('Group not found');

    const { calculateNetBalances } = require('../services/settlementEngine');

    const expenses = await Expense.find({ group: req.params.groupId });
    const balances = calculateNetBalances(expenses, group.members);

    const memberBalance = balances[userId];
    if (memberBalance && Math.abs(memberBalance) > 0.01) {
      return res.send(`Cannot remove member — unsettled balance of ₹${Math.abs(memberBalance).toFixed(2)}.`);
    }

    const removedUser = await User.findById(userId);
    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();

    await logActivity(
      req.params.groupId,
      req.body.userId,
      'member_removed',
      `${removedUser ? removedUser.name : 'User'} was removed from the group`
    );
    await invalidateSettlementCache(req.params.groupId);
    res.redirect(`/settlement/${req.params.groupId}`);
  } catch (err) {
    res.send('Error removing member: ' + err.message);
  }
});

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
    const { balances, transactions } = await getCachedSettlement(
      req.params.groupId,
      expenses,
      group.members.map(m => m._id)
    );

    const memberMap = {};
    group.members.forEach(m => { memberMap[m._id.toString()] = m.name; });

    const balancesWithNames = Object.entries(balances).map(([id, balance]) => ({
      userId: id,
      name: memberMap[id] || 'Unknown',
      balance: Math.round(balance * 100) / 100,
    }));

    const transactionsWithNames = transactions.map(t => ({
      from: t.from,
      to: t.to,
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

    const ActivityLog = require('../models/ActivityLog');
    const logs = await ActivityLog.find({ group: req.params.groupId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('actor', 'name');

    const activityFeed = logs.map(log => ({
      actorName: log.actor?.name || 'Someone',
      details: log.details,
      timeAgo: getTimeAgo(log.createdAt),
    }));

    res.render('settlement', {
      groupName: group.name,
      groupId: req.params.groupId,
      members: group.members,
      balances: balancesWithNames,
      transactions: transactionsWithNames,
      aiSummary,
      spendingInsights,
      expenses: expensesWithDetails,
      activityFeed,
    });
  } catch (err) {
    res.send('Error loading settlement: ' + err.message);
  }
});

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// ADD MEMBER BY NAME DIRECTLY
router.post('/settlement/:groupId/add-member', async (req, res) => {
  try {
    const name = req.body.name ? req.body.name.trim() : '';
    if (!name) return res.send('Member name is required');

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.send('Group not found');

    // 1. Look up user by name (case-insensitive)
    let userToAdd = await User.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    
    // 2. If user doesn't exist, create a lightweight guest profile automatically
    if (!userToAdd) {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dummyEmail = `${cleanName}_${Date.now()}@local.split`;
      const hashedPassword = await bcrypt.hash('password123', 10);
      userToAdd = await User.create({ name, email: dummyEmail, password: hashedPassword });
    }

    // 3. Check if they are already in the group
    const isAlreadyMember = group.members.some(mId => mId.toString() === userToAdd._id.toString());

    if (!isAlreadyMember) {
      group.members.push(userToAdd._id);
      await group.save();

      try {
        await logActivity(
          req.params.groupId,
          userToAdd._id,
          'member_added',
          `${userToAdd.name} joined the group`
        );
      } catch (logErr) {
        console.error('Activity log error (non-fatal):', logErr.message);
      }
    }

    // 4. Invalidate cache and reload page
    await invalidateSettlementCache(req.params.groupId);
    res.redirect(`/settlement/${req.params.groupId}`);
  } catch (err) {
    console.error('Add Member Error:', err);
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

    await logActivity(
      req.params.groupId,
      paidBy,
      'expense_added',
      `Added "${description}" — ₹${amount}`
    );

    await invalidateSettlementCache(req.params.groupId);
    res.redirect(`/settlement/${req.params.groupId}`);
  } catch (err) {
    res.send('Error adding expense: ' + err.message);
  }
});

module.exports = router;