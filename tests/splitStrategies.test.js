const { calculateShares } = require('../services/splitStrategies');

test('equal split distributes leftover paise and sums exactly', () => {
  const s = calculateShares('equal', 100, ['A', 'B', 'C']);
  const sum = Object.values(s).reduce((a, b) => a + b, 0);
  expect(Math.round(sum * 100)).toBe(10000);
});

test('exact split rejects amounts that do not add up', () => {
  expect(() => calculateShares('exact', 100, ['A', 'B'], { A: 30, B: 60 })).toThrow();
});

test('percentage split works', () => {
  const s = calculateShares('percentage', 1000, ['A', 'B'], { A: 70, B: 30 });
  expect(s).toEqual({ A: 700, B: 300 });
});

test('percentage split must total 100', () => {
  expect(() => calculateShares('percentage', 1000, ['A', 'B'], { A: 50, B: 40 })).toThrow();
});