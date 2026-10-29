// ATLAS is intentionally dependency-free at runtime. Catch accidental third-party
// scripts, stylesheets and remote assets before they reach a public deployment.
// Third-party code must be reviewed for licence, privacy and offline behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8');

function externalResources(source) {
  return [...source.matchAll(/<(?:script|link|img|iframe|source)\\b[^>]*?\\b(?:src|href|srcset)\\s*=\\s*(['"])(.*?)\\1/gi)]
    .map(match => match[2]).filter(value => /^(?:https?:)?\\/\\//i.test(value));
}

test('app shell does not load unreviewed remote scripts, CSS, fonts or images', () => {
  assert.deepEqual(externalResources(html), [], 'External resource requires licence/security/offline review');
});

test('PWA manifest does not reference remote assets', () => {
  const parsed = JSON.parse(manifest);
  const urls = [parsed.start_url, parsed.scope, ...(parsed.icons || []).map(icon => icon.src)].filter(Boolean);
  assert.deepEqual(urls.filter(value => /^(?:https?:)?\\/\\//i.test(value)), []);
});

test('app shell declares a restrictive referrer policy', () => {
  assert.match(html, /<meta\\s+name="referrer"\\s+content="no-referrer"/i);
});
