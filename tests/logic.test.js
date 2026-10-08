import { test } from 'node:test';
import assert from 'node:assert/strict';
import { today, addDays, weekStart, monthCells, shiftMonth, targetStatus, streak, quoteFor, validateBackup } from '../src/logic.js';

test('India midnight determines the daily target and quote date', () => {
  assert.equal(today(new Date('2026-10-06T18:29:59Z')), '2026-10-06');
  assert.equal(today(new Date('2026-10-06T18:30:00Z')), '2026-10-07');
});
test('Monday weeks work across year boundaries and on Sundays', () => {
  assert.equal(weekStart('2026-10-11'), '2026-10-05');
  assert.equal(weekStart('2027-01-01'), '2026-12-28');
  assert.equal(weekStart('2026-10-05'), '2026-10-05');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
test('calendar aligns dates to weekdays and handles leap months', () => {
  assert.deepEqual(monthCells('2026-10').slice(0, 4), [null, null, null, '2026-10-01']);
  assert.equal(monthCells('2028-02').filter(Boolean).length, 29);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
});
test('empty plans earn no reward and ordinary tasks do not block daily target', () => {
  assert.equal(targetStatus([], 'task', '2026-10-07').complete, false);
  const rows = [
    { kind: 'task', period: '2026-10-07', payload: { done: true, target: true } },
    { kind: 'task', period: '2026-10-07', payload: { done: false, target: false } },
    { kind: 'task', period: '2026-10-08', payload: { done: false, target: true } }
  ];
  assert.deepEqual(targetStatus(rows, 'task', '2026-10-07'), { total: 1, done: 1, percent: 100, complete: true });
  rows[0].payload.done = false;
  assert.equal(targetStatus(rows, 'task', '2026-10-07').complete, false);
});
test('streak waits until today ends, ignores weekly rewards, and stops at gaps', () => {
  const rewards = ['2026-10-05','2026-10-06'].map(period => ({ kind:'daily', period }));
  rewards.push({ kind:'weekly', period:'2026-10-07' });
  assert.equal(streak(rewards, '2026-10-07'), 2);
  assert.equal(streak(rewards, '2026-10-08'), 0);
  rewards.push({ kind:'daily', period:'2026-10-07' });
  assert.equal(streak(rewards, '2026-10-07'), 3);
});
test('daily quote stays stable within date and changes on next day', () => {
  assert.equal(quoteFor('2026-10-07'), quoteFor('2026-10-07'));
  assert.notEqual(quoteFor('2026-10-07'), quoteFor('2026-10-08'));
});
test('backup validates dates and IDs and drops account identity', () => {
  const row = { id:'560fb8c5-faa8-4e41-a61e-ef81ef44ae22', kind:'task', period:'2026-10-07', user_id:'other-user', payload:{ title:'Revise', target:true, done:false } };
  assert.equal(validateBackup({ version:1, entries:[row] })[0].user_id, undefined);
  assert.throws(() => validateBackup({ version:1, entries:[row,row] }), /duplicate/);
  assert.throws(() => validateBackup({ version:1, entries:[{ ...row, period:'2026-02-30' }] }), /date/);
  assert.throws(() => validateBackup({ version:1, entries:[{ ...row, kind:'weekly' }] }), /Monday/);
  assert.throws(() => validateBackup({ version:1, entries:[{ ...row, kind:'reward' }] }), /invalid/);
});
