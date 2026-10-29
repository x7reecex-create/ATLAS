import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const lineWith = fragment => html.split('\n').find(line => line.includes(fragment));

test('portrait Calendar day controls expose their visible date in the accessible label', () => {
  const line = lineWith('const strip=dates.map(d=>');
  assert.ok(line, 'portrait week markup exists');
  assert.ok(line.includes("aria-label="));
  assert.ok(line.includes("calFormatDate(d,{weekday:'short'})"));
  assert.ok(line.includes("Number(d.slice(-2))"));
  assert.ok(line.includes('</span> <strong>'), 'visible date text is whitespace-separated');
});
test('landscape Calendar day headings expose their visible date in accessible label', () => {
  const line = lineWith('const headers=dates.map(day=>');
  assert.ok(line, 'week header markup exists');
  assert.ok(line.includes('— Open '), 'descriptive date action is preserved');
  assert.ok(line.includes("calFormatDate(day,{weekday:'short'})"));
  assert.ok(line.includes('</span> <strong>'), 'visible date text is whitespace-separated');
});
test('non-interactive current-time line does not carry prohibited ARIA label', () => {
  const line = lineWith('const line=day===nowDate?');
  assert.ok(line, 'week timeline now marker exists');
  assert.ok(line.includes('class="cal-current-line"'));
  assert.ok(line.includes('aria-hidden="true"'));
  assert.ok(!line.includes('aria-label="Current time"'));
});
