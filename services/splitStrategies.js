// Each strategy returns { userId: shareAmount } and the shares sum EXACTLY to amount.
// Work in paise (integers) to avoid float errors.

const toPaise = (r) => Math.round(r * 100);
const toRupees = (p) => p / 100;

const strategies = {
  equal(amount, participants) {
    const total = toPaise(amount);
    const base = Math.floor(total / participants.length);
    let remainder = total - base * participants.length;   // leftover paise
    const shares = {};
    participants.forEach((id) => {
      shares[id] = toRupees(base + (remainder-- > 0 ? 1 : 0));   // spread leftover 1 paisa each
    });
    return shares;
  },

  exact(amount, participants, details) {
    // details: { userId: amount }
    const shares = {};
    let sum = 0;
    participants.forEach((id) => {
      const v = toPaise(Number(details[id] || 0));
      shares[id] = toRupees(v);
      sum += v;
    });
    if (sum !== toPaise(amount)) throw new Error('Exact amounts must add up to the total');
    return shares;
  },

  percentage(amount, participants, details) {
    // details: { userId: percent }
    const pctSum = participants.reduce((s, id) => s + Number(details[id] || 0), 0);
    if (Math.abs(pctSum - 100) > 0.001) throw new Error('Percentages must add up to 100');
    const total = toPaise(amount);
    const shares = {};
    let assigned = 0;
    participants.forEach((id, i) => {
      const isLast = i === participants.length - 1;
      const p = isLast ? total - assigned : Math.round((total * details[id]) / 100);
      assigned += p;
      shares[id] = toRupees(p);       // last person absorbs rounding difference
    });
    return shares;
  },
};

function calculateShares(type, amount, participants, details = {}) {
  const strategy = strategies[type || 'equal'];
  if (!strategy) throw new Error(`Unknown split type: ${type}`);
  return strategy(amount, participants.map(String), details);
}

module.exports = { calculateShares };