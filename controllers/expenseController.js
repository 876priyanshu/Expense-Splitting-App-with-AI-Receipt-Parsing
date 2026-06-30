const Expense = require('../models/Expense');
const Group = require('../models/Group');

const { categorizeExpense } = require('../services/aiService');

const addExpense = async (req, res) => {
  try {
    const { groupId, amount, description } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    // Categorize the expense using AI - non-blocking failure (defaults handled inside)
    const category = await categorizeExpense(description);

    const expense = await Expense.create({
      group: groupId,
      paidBy: req.user.id,
      amount,
      description,
      splitAmong: group.members,
      category,
    });

    res.status(201).json({ message: 'Expense added', expense });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
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