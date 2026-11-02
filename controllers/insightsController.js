const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { generateSpendingInsights } = require('../services/aiService');

const getGroupInsights = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const expenses = await Expense.find({ group: groupId });
    
    if (!expenses || expenses.length === 0) {
      return res.status(200).json({ insights: "No expenses logged yet. Add some to get insights!" });
    }

    // Calls your robust aiService function
    const insights = await generateSpendingInsights(expenses, group.name);
    
    res.status(200).json({ insights });
    
  } catch (err) {
    console.error("Insights Controller Error:", err);
    res.status(500).json({ message: "Failed to load insights", error: err.message });
  }
};

module.exports = { getGroupInsights };