import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const match=html.match(/function atlasNormalizeAppearance\(value\)\{[\s\S]*?\n\}/);
assert.ok(match,'appearance normalizer must exist');
const normalize=new Function('atlasHex',match[0]+';return atlasNormalizeAppearance;')(
  value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)
);
test('motion defaults to device preference for old backups',()=>{
  assert.equal(normalize({}).motion,'system');
  assert.equal(normalize(null).motion,'system');
  assert.equal(normalize({motion:'reduce'}).motion,'reduce');
  assert.equal(normalize({motion:'system'}).motion,'system');
});
test('untrusted motion values cannot inject styles',()=>{
  for(const value of ['fast','none','url(evil)',{},['reduce'],null,1])
    assert.equal(normalize({motion:value}).motion,'system');
  assert.match(html,/\['motion',\['system','reduce'\]\]/,'strict import validator rejects invalid motion');
  assert.match(html,/\['accent','density','corners','texture','textSize','fontStyle','motion'\]/,'strict import key allowlist');
});
test('motion control is accessible, persistent and cannot disable OS reduced motion',()=>{
  assert.match(html,/id="atlas-motion-select"[^>]*aria-describedby="atlas-motion-help"/);
  assert.match(html,/root\.dataset\.atlasMotion=appearance\.motion/);
  assert.match(html,/data-atlas-motion="reduce"[^\n]*animation-duration:\.01ms!important/);
  assert.match(html,/@media\s*\(prefers-reduced-motion:reduce\)/,'OS preference remains in force');
  assert.match(html,/'atlas-motion-select':\['motion',\['system','reduce'\]\]/);
});
