import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const begin = html.indexOf('function calICSEscape(s){');
const end = html.indexOf('function calDownload(', begin);
assert.ok(begin >= 0 && end > begin, 'production iCalendar exporter is available');

const dateAdd = (date, days) => {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const calMins = time => {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
};
const calClock = minutes => {
  const m = minutes % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
const data = { calendarEvents: [] };
const api = vm.runInNewContext(html.slice(begin, end) + '\n({calICSEscape,calICSFold,calICSExport})', {
  data, dateAdd, calMins, calClock, Date
});

function verifyFolded(ics) {
  const physical = ics.split('\r\n').filter(Boolean);
  for (const line of physical) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75,
      'iCalendar physical line exceeds 75 UTF-8 bytes: ' + Buffer.byteLength(line, 'utf8'));
    assert.doesNotMatch(line, /\uFFFD/, 'Unicode character must not be split');
  }
  assert.ok(!ics.replaceAll('\r\n', '').includes('\n'), 'all line endings use CRLF');
  assert.ok(!ics.replaceAll('\r\n', '').includes('\r'), 'no raw carriage returns');
  return ics.replace(/\r\n[ \t]/g, '').split('\r\n');
}

test('folds ASCII, accents and emoji by UTF-8 octets without corrupting characters', () => {
  const samples = ['A'.repeat(300), 'é'.repeat(110), '🗓️🚗👨‍👦'.repeat(50), 'ABCé🗓️'.repeat(90)];
  for (const sample of samples) {
    const folded = api.calICSFold('SUMMARY:' + sample);
    const logical = verifyFolded(folded).join('');
    assert.equal(logical, 'SUMMARY:' + sample);
    assert.ok(folded.includes('\r\n '), 'long content has RFC continuation whitespace');
  }
});

test('exports long multilingual titles and newline notes without injecting physical lines', () => {
  const title = 'Family 🗓️ — visita à Glasgow '.repeat(12);
  const details = 'Line one\r\nLine two\rLine three\nLine four, five; six \\ done';
  data.calendarEvents = [{
    id:'event-unicode',title,details,startDate:'2026-11-05',
    startTime:'09:30',durationMins:60,allDay:false,
    category:'personal',repeat:'none',exceptions:{}
  }];
  const ics = api.calICSExport();
  const logical = verifyFolded(ics);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(logical.includes('SUMMARY:' + api.calICSEscape(title)), 'full Unicode title survives folding');
  assert.ok(logical.includes('DESCRIPTION:' + api.calICSEscape(details)), 'note content survives folding');
  assert.ok(logical.includes('DTSTART;TZID=Europe/London:20261105T093000'));
  assert.ok(logical.includes('DTEND;TZID=Europe/London:20261105T103000'));
  assert.equal(api.calICSEscape(details), String.raw`Line one\nLine two\nLine three\nLine four\, five\; six \\ done`);
});

test('short calendar properties remain unchanged and all-day bounds are exclusive', () => {
  data.calendarEvents = [{
    id:'all-day',title:'School',details:'',startDate:'2026-11-05',
    startTime:'',durationMins:0,allDay:true,
    category:'personal',repeat:'none',exceptions:{}
  }];
  const lines = verifyFolded(api.calICSExport());
  assert.ok(lines.includes('SUMMARY:School'));
  assert.ok(lines.includes('DTSTART;VALUE=DATE:20261105'));
  assert.ok(lines.includes('DTEND;VALUE=DATE:20261106'));
});