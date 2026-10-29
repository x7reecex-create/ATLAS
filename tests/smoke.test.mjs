import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const html = read('index.html');
test('ATLAS client shell and application syntax', () => {
  assert.match(html, /<html lang="en-GB">/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, 'inline application script');
  assert.doesNotThrow(() => new Function(script[1]));
  assert.match(html, /function linkScreen\(/);
  assert.match(html, /function atlasVoiceReview\(/);
});
test('service worker syntax and offline shell', () => {
  const sw = read('sw.js');
  assert.doesNotThrow(() => new Function(sw));
  assert.match(sw, /atlas-private-ios-v22-public-shell/);
});
test('manifest and third-party licences', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.ok(manifest.name || manifest.short_name);
  assert.match(read('THIRD_PARTY_NOTICES.md'), /Lucide/);
});
