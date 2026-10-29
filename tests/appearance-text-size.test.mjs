import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const match=html.match(/function atlasNormalizeAppearance\(value\)\{[\s\S]*?\n\}/);
assert.ok(match,'appearance normalizer must exist');
const normalize=new Function('atlasHex',match[0]+';return atlasNormalizeAppearance;')(
  value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)
);
test('large text preference is bounded and backward compatible',()=>{
  assert.equal(normalize({textSize:'large'}).textSize,'large');
  assert.equal(normalize({}).textSize,'standard','old backups keep standard size');
  assert.equal(normalize({textSize:'999px'}).textSize,'standard','untrusted import cannot inject CSS');
  assert.equal(normalize({textSize:{value:'large'}}).textSize,'standard');
  assert.equal(normalize(null).textSize,'standard');
});
test('larger text is opt-in and applies to real workspace copy',()=>{
  assert.match(html,/root\.dataset\.atlasTextSize=appearance\.textSize/);
  assert.match(html,/id="atlas-text-size-select"/);
  assert.match(html,/\['accent','density','corners','texture','textSize'\]/,'strict backup validator recognises the new safe field');
  assert.match(html,/\['textSize',\['standard','large'\]\]/,'backup validator rejects unbounded text size');
  assert.match(html,/data-atlas-text-size="large"[^\n]*\.signature-hero p/);
  assert.match(html,/data-atlas-text-size="large"[^\n]*\.taskmeta/);
});
