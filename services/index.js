const groupRepo = require('../repositories/groupRepository');
const expenseRepo = require('../repositories/expenseRepository');
const { categorizeExpense } = require('./aiService');
const { invalidateSettlementCache } = require('./settlementCache');
const { logActivity } = require('./activityLogger');
const { createExpenseService } = require('./expenseService');

module.exports = {
  expenseService: createExpenseService({
    groupRepo, expenseRepo,
    categorize: categorizeExpense,
    invalidateCache: invalidateSettlementCache,
    logActivity,
  }),
};