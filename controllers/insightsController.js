const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { generateSpendingInsights } = require('../services/aiService');

const getGroupInsights = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    const expenses = await Expense.find({ group: groupId });
    const insights = await generateSpendingInsights(expenses, group.name);

    res.status(200).json({ insights });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getGroupInsights };