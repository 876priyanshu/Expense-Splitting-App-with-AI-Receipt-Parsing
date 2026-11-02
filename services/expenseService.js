const { calculateShares } = require('./splitStrategies');

function createExpenseService({ groupRepo, expenseRepo, categorize, invalidateCache, logActivity }) {
  return {
    async addExpense({ groupId, paidBy, amount, description, splitType = 'equal', details = {} }) {
      const group = await groupRepo.findById(groupId);
      if (!group) { const e = new Error('Group not found'); e.status = 404; throw e; }

      const memberIds = group.members.map(String);
      if (!memberIds.includes(String(paidBy))) {
        const e = new Error('Not a member of this group'); e.status = 403; throw e;
      }

      const shares = calculateShares(splitType, amount, memberIds, details);
      const category = await categorize(description);

      const expense = await expenseRepo.create({
        group: groupId, paidBy, amount, description,
        splitAmong: group.members, splitType, shares, category,
      });

      await invalidateCache(groupId);
      await logActivity(groupId, paidBy, 'expense_added', `Added "${description}" — ₹${amount}`);
      return expense;
    },
  };
}

module.exports = { createExpenseService };