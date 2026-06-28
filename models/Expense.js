const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  splitAmong: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  category: { type: String, default: 'Uncategorized' },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);