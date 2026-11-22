const { test } = require('node:test');
const assert = require('node:assert/strict');
const plan = require('../site/seating.js');

function people(count) {
  return Array.from({ length: count }, (_, index) => ({ id: String(index) }));
}

test('fifty passengers, confirmed family, adjacent pair, fixed seat', () => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const passengers = people(50);
    passengers.slice(0, 5).forEach(p => { p.booking_group = 'family'; });
    passengers.slice(5, 7).forEach(p => { p.booking_group = 'pair'; });
    Object.assign(passengers[49], { bus: '1', seat: '50' });
    const { assignments, pending } = plan(passengers, 50, 1);
    assert.equal(pending.length, 0);
    assert.equal(assignments.length, 49);
    assert.equal(new Set(assignments.map(p => p.seat)).size, 49);
    assert.ok(assignments.every(p => p.bus === '1' && Number(p.seat) < 50));
    const pair = assignments.filter(p => ['5', '6'].includes(p.id)).map(p => +p.seat).sort((a, b) => a - b);
    assert.equal(pair[0] % 2, 1);
    assert.equal(pair[1] - pair[0], 1);
  }
});

test('no overflow bus and no group split at capacity', () => {
  const passengers = people(5);
  passengers.slice(0, 3).forEach(p => { p.booking_group = 'family'; });
  const { assignments, pending } = plan(passengers, 2, 1);
  assert.deepEqual(pending.map(g => g.length), [3]);
  assert.equal(assignments.length, 2);
  assert.ok(assignments.every(p => p.bus === '1'));
});

test('invalid and colliding assigned seats are rejected', () => {
  assert.throws(() => plan(people(1), 0, 1));
  assert.throws(() => plan([{ id: 'a', bus: '1', seat: '51' }], 50, 1));
  assert.throws(() => plan([{ id: 'a', bus: '1', seat: '1' }, { id: 'b', bus: '1', seat: '1' }], 50, 1));
});

test('a partly seated pair can be kept together', () => {
  const { assignments, pending } = plan([
    { id: 'a', booking_group: 'pair', bus: '1', seat: '4' },
    { id: 'b', booking_group: 'pair' },
  ], 5, 1);
  assert.deepEqual(assignments, [{ id: 'b', bus: '1', seat: '3' }]);
  assert.deepEqual(pending, []);
});
