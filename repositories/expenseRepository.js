const Expense = require('../models/Expense');

module.exports = {
  create: (data) => Expense.create(data),
  findByGroup: (groupId) => Expense.find({ group: groupId }),
};