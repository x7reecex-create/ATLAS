import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
test('reduced motion disables animations and transitions globally', () => {
  const rule = html.match(/@media\s*\(prefers-reduced-motion:reduce\)\s*\{([^\n]+)\}/);
  assert.ok(rule, 'reduced motion media query missing');
  assert.match(rule[1], /animation-duration:\.01ms!important/);
  assert.match(rule[1], /transition-duration:\.01ms!important/);
  assert.match(rule[1], /scroll-behavior:auto!important/);
});
