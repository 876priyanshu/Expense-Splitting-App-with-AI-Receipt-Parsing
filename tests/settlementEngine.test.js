const { calculateNetBalances, simplifySettlements, generateSettlement } = require('../services/settlementEngine');

describe('calculateNetBalances', () => {
  test('calculates correct balances for equal split among 2 people', () => {
    const expenses = [
      { paidBy: 'A', amount: 2000, splitAmong: ['A', 'B'] },
    ];
    const balances = calculateNetBalances(expenses, ['A', 'B']);

    expect(balances['A']).toBe(1000);
    expect(balances['B']).toBe(-1000);
  });

  test('handles a single-person group with no debts', () => {
    const expenses = [
      { paidBy: 'A', amount: 1000, splitAmong: ['A'] },
    ];
    const balances = calculateNetBalances(expenses, ['A']);

    expect(balances['A']).toBe(0);
  });

  test('handles uneven split among 3 people (division with remainder)', () => {
    const expenses = [
      { paidBy: 'A', amount: 100, splitAmong: ['A', 'B', 'C'] },
    ];
    const balances = calculateNetBalances(expenses, ['A', 'B', 'C']);

    // 100 / 3 = 33.333...
    // A paid 100, owes 33.33 → net +66.67
    // B and C each owe 33.33 → net -33.33 each
    expect(balances['A']).toBeCloseTo(66.67, 1);
    expect(balances['B']).toBeCloseTo(-33.33, 1);
    expect(balances['C']).toBeCloseTo(-33.33, 1);
  });

  test('accumulates balances correctly across multiple expenses', () => {
    const expenses = [
      { paidBy: 'A', amount: 3000, splitAmong: ['A'] },
      { paidBy: 'A', amount: 2000, splitAmong: ['A', 'B'] },
      { paidBy: 'B', amount: 1000, splitAmong: ['A', 'B'] },
    ];
    const balances = calculateNetBalances(expenses, ['A', 'B']);

    // Expense 1: A pays 3000, splits with only self → net 0
    // Expense 2: A pays 2000, split A/B → A +1000, B -1000
    // Expense 3: B pays 1000, split A/B → B +500, A -500
    // Final: A = 1000 - 500 = 500, B = -1000 + 500 = -500
    expect(balances['A']).toBe(500);
    expect(balances['B']).toBe(-500);
  });

  test('handles a group with no expenses at all', () => {
    const balances = calculateNetBalances([], ['A', 'B', 'C']);

    expect(balances['A']).toBe(0);
    expect(balances['B']).toBe(0);
    expect(balances['C']).toBe(0);
  });
});

describe('simplifySettlements', () => {
  test('produces zero transactions when everyone is already settled', () => {
    const balances = { A: 0, B: 0 };
    const transactions = simplifySettlements(balances);

    expect(transactions.length).toBe(0);
  });

  test('produces one transaction for a simple 2-person case', () => {
    const balances = { A: 1000, B: -1000 };
    const transactions = simplifySettlements(balances);

    expect(transactions.length).toBe(1);
    expect(transactions[0]).toEqual({ from: 'B', to: 'A', amount: 1000 });
  });

  test('minimizes transactions for 4 people with mixed balances', () => {
    // 2 creditors, 2 debtors — should never need more than 3 transactions
    // (general rule: N people need at most N-1 transactions)
    const balances = { A: 500, B: 300, C: -400, D: -400 };
    const transactions = simplifySettlements(balances);

    expect(transactions.length).toBeLessThanOrEqual(3);

    // Verify the transactions actually balance out correctly
    const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
    expect(totalPaid).toBeCloseTo(800, 1); // total debt in the system
  });

  test('handles a larger group of 6 people correctly', () => {
    const balances = {
      A: 1200,
      B: 800,
      C: -500,
      D: -600,
      E: -400,
      F: -500,
    };
    const transactions = simplifySettlements(balances);

    // 6 people should need at most 5 transactions (N-1 rule)
    expect(transactions.length).toBeLessThanOrEqual(5);

    // Every creditor's total received should match their original balance
    const totalReceivedByA = transactions
      .filter(t => t.to === 'A')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalReceivedByB = transactions
      .filter(t => t.to === 'B')
      .reduce((sum, t) => sum + t.amount, 0);

    expect(totalReceivedByA).toBeCloseTo(1200, 1);
    expect(totalReceivedByB).toBeCloseTo(800, 1);
  });

  test('ignores balances smaller than 1 paisa (floating point noise)', () => {
    const balances = { A: 0.005, B: -0.005 };
    const transactions = simplifySettlements(balances);

    expect(transactions.length).toBe(0);
  });
});

describe('generateSettlement (integration of both functions)', () => {
  test('full flow: expenses in, correct transactions out', () => {
    const expenses = [
      { paidBy: 'A', amount: 3000, splitAmong: ['A'] },
      { paidBy: 'A', amount: 1500, splitAmong: ['A'] },
      { paidBy: 'A', amount: 900, splitAmong: ['A'] },
      { paidBy: 'A', amount: 2000, splitAmong: ['A', 'B'] },
    ];
    const members = ['A', 'B'];

    const { balances, transactions } = generateSettlement(expenses, members);

    expect(balances['A']).toBe(1000);
    expect(balances['B']).toBe(-1000);
    expect(transactions).toEqual([{ from: 'B', to: 'A', amount: 1000 }]);
  });
});