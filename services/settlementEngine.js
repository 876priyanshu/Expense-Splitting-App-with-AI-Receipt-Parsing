function calculateNetBalances(expenses, members) {
  const balances = {};
  
  // 1. Force all member IDs to standard strings
  const memberIds = members.map(m => {
    if (m._id) return m._id.toString();
    if (m.id) return m.id.toString();
    return m.toString();
  });
  
  // 2. Initialize everyone to 0
  memberIds.forEach(id => balances[id] = 0);

  expenses.forEach(expense => {
    // 3. Force expense amount to a strict Number (prevents string concatenation math bugs)
    const amount = Number(expense.amount) || 0;
    if (amount <= 0) return;

    // 4. Force paidBy to standard string
    let paidBy = '';
    if (expense.paidBy) {
      paidBy = expense.paidBy._id ? expense.paidBy._id.toString() : expense.paidBy.toString();
    }
    
    // 5. Default to splitting among EVERYONE if splitAmong is missing from DB
    let splitAmong = memberIds;
    if (expense.splitAmong && expense.splitAmong.length > 0) {
      splitAmong = expense.splitAmong.map(id => {
        if (id._id) return id._id.toString();
        if (id.id) return id.id.toString();
        return id.toString();
      });
    }

    if (splitAmong.length === 0) return;
    const share = amount / splitAmong.length;

    // 6. Apply the math
    if (balances[paidBy] === undefined) balances[paidBy] = 0;
    balances[paidBy] += amount;

    splitAmong.forEach(userId => {
      if (balances[userId] === undefined) balances[userId] = 0;
      balances[userId] -= share;
    });
  });

  return balances;
}

function simplifySettlements(balances) {
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