export const TIMEZONE = 'Asia/Kolkata';
export function today(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = type => p.find(x => x.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekStart(date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -(weekday === 0 ? 6 : weekday - 1));
}
export function dateLabel(date, options = { day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
export function monthCells(month) {
  const first = `${month}-01`, day = new Date(`${first}T12:00:00Z`).getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
}
export function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}
export function targetStatus(rows, kind, period) {
  const targets = rows.filter(r => r.kind === kind && r.period === period && (kind !== 'task' || r.payload.target));
  const done = targets.filter(r => r.payload.done).length;
  return { total: targets.length, done, percent: targets.length ? Math.round(done / targets.length * 100) : 0, complete: targets.length > 0 && done === targets.length };
}
export function streak(rewards, date) {
  const dates = new Set(rewards.filter(r => r.kind === 'daily').map(r => r.period));
  let cursor = dates.has(date) ? date : addDays(date, -1), n = 0;
  while (dates.has(cursor)) { n++; cursor = addDays(cursor, -1); }
  return n;
}
export const quotes = [
  'A difficult question is an invitation to learn, not a verdict on your ability.',
  'A little progress today makes tomorrow’s challenge smaller.',
  'You do not need a perfect day. You need one honest step forward.',
  'Every mistake you understand becomes a point you can earn back.',
  'Keep showing up. Confidence grows through practice.',
  'One concept, one question, one step closer.',
  'Your pace can be gentle and your goals can still be ambitious.',
  'Understanding one tricky idea is progress worth celebrating.',
  'Practice patiently. The patterns become clearer each time.',
  'A short focused session can turn confusion into clarity.',
  'A slow day still counts when you take a step forward.',
  'Let your next question be your next small beginning.',
  'You are building skills, one thoughtful attempt at a time.',
  'Rest, return, and keep learning. Consistency leaves room for both.'
];
export function quoteFor(date) { return quotes[Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000) % quotes.length]; }
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export function validateBackup(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.entries) || value.entries.length > 5000) throw new Error('Choose a PrepBloom version 1 backup (up to 5,000 entries).');
  const ids = new Set(), singletons = new Set();
  return value.entries.map(r => {
    if (!r || typeof r.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.id) || ids.has(r.id)) throw new Error('Backup contains an invalid or duplicate entry ID.');
    ids.add(r.id);
    if (!['task', 'weekly', 'slot', 'note', 'syllabus', 'profile'].includes(r.kind) || !r.payload || typeof r.payload !== 'object' || Array.isArray(r.payload)) throw new Error('Backup contains an invalid entry.');
    if (['task', 'weekly', 'slot'].includes(r.kind) && !validDate(r.period)) throw new Error('Backup contains an invalid date.');
    if (r.kind === 'weekly' && weekStart(r.period) !== r.period) throw new Error('Weekly targets must start on Monday.');
    const text = r.payload.title;
    if (['task', 'weekly', 'slot', 'note'].includes(r.kind) && (typeof text !== 'string' || !text.trim() || text.length > 300)) throw new Error('Backup contains an invalid title.');
    if (r.kind === 'note' && (typeof r.payload.body !== 'string' || r.payload.body.length > 20000)) throw new Error('Backup contains an invalid note.');
    if (typeof r.period !== 'string' || r.period.length > 100 || JSON.stringify(r.payload).length > 30000) throw new Error('Backup entry has an invalid period or is too large.');
    if (r.payload.subject !== undefined && typeof r.payload.subject !== 'string') throw new Error('Backup contains an invalid subject.');
    if (['task','weekly','syllabus'].includes(r.kind) && typeof r.payload.done !== 'boolean') throw new Error('Backup contains an invalid completion status.');
    if (r.kind === 'task' && typeof r.payload.target !== 'boolean') throw new Error('Backup contains an invalid daily target.');
    if (r.kind === 'weekly' && (!Number.isInteger(r.payload.goal) || r.payload.goal < 1 || r.payload.goal > 100000 || !Number.isInteger(r.payload.current) || r.payload.current < 0 || r.payload.current > r.payload.goal)) throw new Error('Backup contains invalid weekly progress.');
    if (r.kind === 'slot' && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.payload.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.payload.end) || r.payload.end <= r.payload.start)) throw new Error('Backup contains invalid schedule times.');
    if (r.kind === 'profile' && (typeof r.payload.name !== 'string' || !r.payload.name.trim() || r.payload.name.length > 60)) throw new Error('Backup contains an invalid profile name.');
    if (['profile','syllabus'].includes(r.kind)) {
      const key = `${r.kind}:${r.period}`;
      if (singletons.has(key)) throw new Error('Backup contains duplicate syllabus or profile entries.');
      singletons.add(key);
    }
    return { id: r.id, kind: r.kind, period: r.period || '', payload: r.payload };
  });
}
