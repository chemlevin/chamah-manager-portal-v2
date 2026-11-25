'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateOperatingMonth } = require('../api/calendar-calculation');

test('separates exceptions and short-day hours while preserving source days', () => {
  const days = Array.from({ length: 28 }, (_, i) => ({ date: `2027-02-${String(i + 1).padStart(2, '0')}`, status: 'CLOSED' }));
  days[0].status = 'OPEN';
  const hours = [{ weekday: 1, effectiveFrom: '2026-01-01', minutes: 510, shortDay: false }, { weekday: 5, effectiveFrom: '2026-01-01', minutes: 270, shortDay: true }];
  const result = calculateOperatingMonth({ month: '2027-02', calendarDays: days, hours, exceptions: [{ date: '2027-02-05', status: 'OPEN' }] });
  assert.equal(result.operatingDays, 2);
  assert.equal(result.totalMinutes, 780);
  assert.equal(result.shortDayMinutes, 270);
  assert.equal(result.status, 'CALCULATED');
  assert.equal(days[4].status, 'CLOSED');
});

test('marks missing days and hours unresolved', () => {
  const result = calculateOperatingMonth({ month: '2027-02', calendarDays: [{ date: '2027-02-01', status: 'OPEN' }], hours: [], exceptions: [] });
  assert.equal(result.status, 'UNRESOLVED');
  assert.deepEqual(result.unresolved.map((item) => item.reason), ['MISSING_HOURS', 'INCOMPLETE_CALENDAR_DAYS']);
});

test('rejects conflicting decisions', () => {
  assert.throws(() => calculateOperatingMonth({ month: '2027-02', calendarDays: [], hours: [], exceptions: [{ date: '2027-02-01' }, { date: '2027-02-01' }] }), /Conflicting exceptions/);
});

test('surfaces exceptions without source days and partial days exceeding scheduled hours', () => {
  const result = calculateOperatingMonth({
    month: '2027-02',
    calendarDays: [{ date: '2027-02-01', status: 'PARTIAL', minutes: 600 }],
    hours: [{ weekday: 1, effectiveFrom: '2026-01-01', minutes: 510, shortDay: false }],
    exceptions: [{ date: '2027-02-02', status: 'OPEN' }]
  });
  assert.equal(result.status, 'UNRESOLVED');
  assert.deepEqual(result.unresolved.map((item) => item.reason), ['PARTIAL_EXCEEDS_OPERATING_HOURS', 'EXCEPTION_WITHOUT_SOURCE_DAY', 'INCOMPLETE_CALENDAR_DAYS']);
});
