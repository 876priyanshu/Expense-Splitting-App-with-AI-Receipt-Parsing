const Expense = require('../models/Expense');
const Group = require('../models/Group');

const { categorizeExpense } = require('../services/aiService');

const { invalidateSettlementCache } = require('../services/settlementCache');

const addExpense = async (req, res) => {
  try {
    // 1. CRITICAL FIX: Pull groupId from the URL params, not req.body
    const { groupId } = req.params; 
    const { amount, description, paidBy } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).send('Group not found');

    const category = await categorizeExpense(description);

    await Expense.create({
      group: groupId,
      paidBy: paidBy || req.user.id,
      amount: Number(amount),
      description,
      splitAmong: group.members, 
      category,
    });

    // 2. This will now successfully clear the correct Redis key
    await invalidateSettlementCache(groupId); 

    // 3. Force the page to reload so you see the fresh live math
    res.redirect(`/settlement/${groupId}`);
  } catch (err) {
    console.error("Expense Error:", err);
    res.status(500).send('Server error');
  }
};



const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    const expenses = await Expense.find({ group: groupId })
      .populate('paidBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ expenses });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { addExpense, getGroupExpenses };
