import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Execute the production inline parser, rather than a reimplementation.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function calParseQuick(s,base=calLondonToday()){');
const end = html.indexOf('function calEditEventForm(', start);
assert.ok(start >= 0 && end > start, 'production quick-add parser exists');
const sandbox = {
  calLondonToday: () => '2026-10-29',
  calDate: s => new Date(s + 'T12:00:00'),
  dateAdd: (s, n) => {
    const [year, month, day] = s.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12);
    d.setDate(d.getDate() + n);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  },
  calClock: mins => String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0'),
  validDate: s => /^\d{4}-\d\d-\d\d$/.test(s)
};
const parse = vm.runInNewContext(html.slice(start, end) + '\ncalParseQuick', sandbox);
const cases = [
  ['2026-10-29', 'Dentist next Monday at 3pm', '2026-11-02', '15:00'],
  ['2026-10-29', 'Dentist Monday at 3pm', '2026-11-02', '15:00'],
  ['2026-10-29', 'Meeting next Friday at 9am', '2026-11-06', '09:00'],
  ['2026-10-29', 'Meeting Friday at 9am', '2026-10-30', '09:00'],
  ['2026-10-29', 'Call next Sunday', '2026-11-08', ''],
  ['2026-10-29', 'Call next Thursday', '2026-11-05', ''],
  ['2026-10-26', 'Call next Monday', '2026-11-02', ''],
  ['2026-10-26', 'Call next Tuesday', '2026-11-03', ''],
  ['2026-11-01', 'Call next Monday', '2026-11-02', ''],
  ['2026-11-01', 'Call next Sunday', '2026-11-08', ''],
  ['2026-11-01', 'Call Sunday', '2026-11-08', '']
];
for (const [base, phrase, expectedDate, expectedTime] of cases) {
  test(`quick-add: ${phrase} from ${base} => ${expectedDate}`, () => {
    const parsed = parse(phrase, base);
    assert.equal(parsed.startDate, expectedDate);
    assert.ok(parsed.title, 'event title preserved');
    if (expectedTime) assert.equal(parsed.startTime, expectedTime);
    else assert.equal(parsed.allDay, true);
  });
}
test('quick-add does not shift explicit dates or tomorrow', () => {
  assert.equal(parse('Dentist tomorrow at 3pm', '2026-10-29').startDate, '2026-10-30');
  assert.equal(parse('Dentist 2026-11-05 at 3pm', '2026-10-29').startDate, '2026-11-05');
});
