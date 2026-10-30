import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('visual UX changes remain syntactically valid',()=>{
 const script=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script[1]));
});
test('task focus count is interpolated and empty states stay compact',()=>{
 assert.match(html,/heading\(\x60(?:Your focus|Focus) · \$\{focus\.length\}\/3\x60\)/);
 assert.doesNotMatch(html,/heading\('Focus · \$\{focus\.length\}\/3'\)/);
 assert.match(html,/atlas-quiet-empty/);
 assert.match(html,/!focus\.length&&!due\.length&&!planned\.length/);
});
test('all 11 library routes remain grouped, accessible and styled',()=>{
 for(const route of ['projects','notes','money','goals','journal','insights','focusTool','quickTools','decisionTool','link','settings'])
  assert.match(html,new RegExp("\\['"+route+"','"));
 for(const group of ['PLAN & ORGANISE','REFLECT & FOCUS','TOOLS & ACCOUNT'])assert.ok(html.includes(group));
 assert.match(html,/signature-library-group" aria-label=/);
 assert.match(html,/signature-library-row:focus-visible/);
});
test('UK greetings and platform responsiveness',()=>{
 assert.match(html,/timeZone:'Europe\/London'/);
 assert.match(html,/signature-library-sections\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});
