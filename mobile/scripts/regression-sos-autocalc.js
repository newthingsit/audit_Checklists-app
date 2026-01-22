const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getSosAverageItems = (allItems) => {
  if (!allItems?.length) return null;
  const attemptIds = [];
  for (let i = 1; i <= 5; i += 1) {
    const it = allItems.find(x => new RegExp(`^Time\\s*[–\\-]\\s*Attempt\\s*${i}$`, 'i').test((x.title || '').trim()));
    if (it) {
      attemptIds.push(it.id);
    } else {
      return null;
    }
  }
  const avgIt = allItems.find(x => /^Average\s*\(Auto\)$/i.test((x.title || '').trim()));
  if (!avgIt) return null;
  return { attemptIds, averageId: avgIt.id };
};

const computeAverage = (values, attemptIds) => {
  const nums = attemptIds
    .map(id => parseFloat(String(values[id] || '')))
    .filter(n => !Number.isNaN(n));
  return nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : null;
};

const mockItems = [
  { id: 1, title: 'Time – Attempt 1' },
  { id: 2, title: 'Time – Attempt 2' },
  { id: 3, title: 'Time – Attempt 3' },
  { id: 4, title: 'Time – Attempt 4' },
  { id: 5, title: 'Time – Attempt 5' },
  { id: 6, title: 'Average (Auto)' }
];

const sos = getSosAverageItems(mockItems);
assert(sos, 'SOS average items not detected');

const values = { 1: '3', 2: '4', 3: '3', 4: '4', 5: '4' };
const avg = computeAverage(values, sos.attemptIds);
assert(avg === 3.6, `Expected avg 3.6, got ${avg}`);

console.log('PASS: SOS auto-average regression check');
