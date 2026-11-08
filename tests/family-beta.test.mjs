import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html=readFileSync(new URL('../beta/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
test('beta JavaScript parses',()=>{assert.ok(script);new vm.Script(script)});
test('beta has no shared service connection',()=>{
  assert.doesNotMatch(html,/supabase|atlas-preview:v1|atlas-bridge|service_role|connect\.facebook|google-analytics/i);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/atlas-family-beta:workspace:v1/);
});
test('beta includes core workflows',()=>{
  for(const x of ['welcomeForm','editorForm','importFile','data-action="export"','data-action="reset"','new-tasks','new-events','new-notes','new-habits'])assert.ok(html.includes(x),x);
  assert.match(html,/confirm\('Final confirmation/);
  assert.match(html,/MAX=\{/);
});
test('beta has accessible mobile controls and offline-only description',()=>{
  assert.match(html,/aria-label="Mobile navigation"/);
  assert.match(html,/prefers-reduced-motion/);
  assert.match(html,/it will not sync|will not sync|will not sync between devices/i);
  assert.match(html,/type="checkbox"/);
});
