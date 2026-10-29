import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Public-client assets must never contain privileged backend credentials.
// Supabase's publishable/anon key is not a secret; service_role and secret keys are.
const assets = ['index.html', 'sw.js', 'manifest.webmanifest'];
const forbidden = [
  { name: 'Supabase service role token', pattern: /(?:service_role|sb_secret_)[A-Za-z0-9._-]{12,}/i },
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub access token', pattern: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: 'OpenAI secret key', pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{30,}/ },
  { name: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Stripe secret key', pattern: /sk_(?:live|test)_[A-Za-z0-9]{20,}/ }
];
for (const asset of assets) {
  test(`public asset ${asset} contains no known private credential format`, () => {
    const source = readFileSync(new URL(`../${asset}`, import.meta.url), 'utf8');
    for (const { name, pattern } of forbidden) {
      assert.doesNotMatch(source, pattern, `${asset}: potential ${name}; rotate if exposed`);
    }
  });
}
test('scanner detects representative credential shapes', () => {
  for (const [kind, example] of [
    ['private key', '-----BEGIN PRIVATE KEY-----'],
    ['GitHub access token', 'ghp_' + 'a'.repeat(36)],
    ['Supabase service role token', 'sb_secret_' + 'a'.repeat(30)],
    ['AWS access key', 'AKIA' + 'A'.repeat(16)]
  ]) {
    assert.ok(forbidden.some(({ pattern }) => pattern.test(example)), kind);
  }
});
