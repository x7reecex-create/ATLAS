import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = html.slice(0, html.indexOf('</style>'));
const touchBlock = styles.split('/* ATLAS MOBILE TOUCH TARGETS */')[1] || '';
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = touchBlock.match(new RegExp(escaped+'\\s*\\{([^}]*)\\}'));
  assert.ok(match, 'Expected mobile touch rule for '+selector);
  return match[1];
}
test('mobile tap targets are a dedicated coarse-pointer enhancement', () => {
  assert.match(touchBlock, /@media\s*\(pointer:coarse\)/);
});
test('primary small mobile buttons meet 44px minimum touch dimension', () => {
  for (const selector of ['.signature-heading>button', '.micro', '.tabs button', '.content[data-view="calendar"] .cal-period>button', '.cal-hour-add']) {
    const css = rule(selector);
    assert.match(css, /min-height:\s*44px\s*;/, selector + ' height');
    assert.match(css, /min-width:\s*44px\s*;/, selector + ' width');
  }
});
test('calendar view switcher meets 44px touch height', () => {
  assert.match(rule('.content[data-view="calendar"] .cal-views button'), /min-height:\s*44px\s*;/);
});
