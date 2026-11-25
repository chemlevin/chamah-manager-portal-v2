'use strict';

// Inputs are resolved canonical records. Published days and local decisions stay separate.
function calculateOperatingMonth({ month, calendarDays, hours, exceptions }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid reporting month');
  const result = { month, operatingDays: 0, regularMinutes: 0, shortDayMinutes: 0, unresolved: [] };
  const overrides = new Map();
  for (const item of exceptions) {
    if (overrides.has(item.date)) throw new Error(`Conflicting exceptions for ${item.date}`);
    overrides.set(item.date, item);
  }
  const seen = new Set();
  for (const day of calendarDays) {
    if (!day.date.startsWith(`${month}-`)) continue;
    if (seen.has(day.date)) throw new Error(`Duplicate calendar day ${day.date}`);
    seen.add(day.date);
    const date = new Date(`${day.date}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day.date) throw new Error(`Invalid date ${day.date}`);
    const decision = overrides.get(day.date) || day;
    if (!['OPEN', 'CLOSED', 'PARTIAL'].includes(decision.status)) throw new Error(`Invalid status for ${day.date}`);
    if (decision.status === 'CLOSED') continue;
    const matches = hours.filter((item) => item.weekday === date.getUTCDay() && item.effectiveFrom <= day.date && (!item.effectiveTo || item.effectiveTo >= day.date));
    if (matches.length !== 1) { result.unresolved.push({ date: day.date, reason: matches.length ? 'CONFLICTING_HOURS' : 'MISSING_HOURS' }); continue; }
    const minutes = decision.status === 'PARTIAL' ? decision.minutes : matches[0].minutes;
    if (!Number.isInteger(minutes) || minutes <= 0) { result.unresolved.push({ date: day.date, reason: 'MISSING_OPERATING_MINUTES' }); continue; }
    if (decision.status === 'PARTIAL' && minutes > matches[0].minutes) {
      result.unresolved.push({ date: day.date, reason: 'PARTIAL_EXCEEDS_OPERATING_HOURS' });
      continue;
    }
    result.operatingDays += 1;
    if (matches[0].shortDay) result.shortDayMinutes += minutes;
    else result.regularMinutes += minutes;
  }
  for (const date of overrides.keys()) {
    if (date.startsWith(`${month}-`) && !seen.has(date)) result.unresolved.push({ date, reason: 'EXCEPTION_WITHOUT_SOURCE_DAY' });
  }
  const expected = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  if (seen.size !== expected) result.unresolved.push({ reason: 'INCOMPLETE_CALENDAR_DAYS', expected, actual: seen.size });
  result.totalMinutes = result.regularMinutes + result.shortDayMinutes;
  result.status = result.unresolved.length ? 'UNRESOLVED' : 'CALCULATED';
  return result;
}

module.exports = { calculateOperatingMonth };
