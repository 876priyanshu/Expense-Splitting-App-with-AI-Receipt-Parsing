// Pure algorithmic logic - no AI, no DB calls. Easy to test independently.

function calculateNetBalances(expenses, members) {
  // Initialize everyone's balance to 0
  const balances = {};
  members.forEach(memberId => {
    balances[memberId.toString()] = 0;
  });

  expenses.forEach(expense => {
    const paidBy = expense.paidBy.toString();
    const splitAmong = expense.splitAmong.map(id => id.toString());
    const share = expense.amount / splitAmong.length;

    // The person who paid gets credited the full amount
    balances[paidBy] += expense.amount;

    // Everyone in the split (including payer) owes their share
    splitAmong.forEach(userId => {
      balances[userId] -= share;
    });
  });

  return balances; // positive = owed money, negative = owes money
}

function simplifySettlements(balances) {
  // Convert to array of {userId, balance}, ignore near-zero balances
  const balanceArray = Object.entries(balances)
    .map(([userId, balance]) => ({ userId, balance: Math.round(balance * 100) / 100 }))
    .filter(entry => Math.abs(entry.balance) > 0.01);

  const creditors = balanceArray.filter(e => e.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = balanceArray.filter(e => e.balance < 0).sort((a, b) => a.balance - b.balance);

  const transactions = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const amount = Math.min(creditor.balance, -debtor.balance);

    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(amount * 100) / 100,
    });

    creditor.balance -= amount;
    debtor.balance += amount;

    if (Math.abs(creditor.balance) < 0.01) i++;
    if (Math.abs(debtor.balance) < 0.01) j++;
  }

  return transactions;
}

function generateSettlement(expenses, members) {
  const balances = calculateNetBalances(expenses, members);
  const transactions = simplifySettlements(balances);
  return { balances, transactions };
}

module.exports = { calculateNetBalances, simplifySettlements, generateSettlement };