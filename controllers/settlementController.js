const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { generateSettlement } = require('../services/settlementEngine');

const getSettlement = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    const expenses = await Expense.find({ group: groupId });

    if (expenses.length === 0) {
      return res.status(200).json({ message: 'No expenses yet', transactions: [] });
    }

    const { balances, transactions } = generateSettlement(expenses, group.members);

    res.status(200).json({ balances, transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getSettlement };