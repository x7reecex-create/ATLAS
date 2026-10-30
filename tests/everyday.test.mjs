import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=name=>{const m=html.match(new RegExp('function '+name+'\\([^]*?\\n\\}'));assert.ok(m,'Missing '+name);return m[0]};
const picks=new Function('byPriority',source('atlasHomePicks')+';return atlasHomePicks')((a,b)=>(a.order||0)-(b.order||0));
test('Home includes a newly captured undated task without pretending future tasks are due',()=>{
 const tasks=[{id:'later',due:'2026-11-02'},{id:'scheduled',planned:'2026-11-01'},{id:'captured',stage:'inbox'},{id:'done',done:true}];
 assert.deepEqual(picks(tasks,'2026-10-30').map(t=>t.id),['captured']);
});
test('Home keeps urgency and chosen focus ahead of unscheduled tasks',()=>{
 const tasks=[{id:'inbox'},{id:'focus',focus:true},{id:'planned',planned:'2026-10-30'},{id:'due',due:'2026-10-29'}];
 assert.deepEqual(picks(tasks,'2026-10-30').map(t=>t.id),['due','focus','planned']);
});
test('capture rolls back on storage failure and retries exactly once',()=>{
 let succeeds=false,renders=0,messages=[];const data={tasks:[]};
 const capture=new Function('data','createTask','save','render','showToast',source('atlasCaptureTask')+';return atlasCaptureTask')(data,title=>{const t={id:'new',title};data.tasks.unshift(t);return t},()=>succeeds,()=>renders++,m=>messages.push(m));
 assert.equal(capture('  Buy milk  '),false);
 assert.deepEqual(data.tasks,[]);assert.equal(renders,0);assert.deepEqual(messages,[]);
 succeeds=true;assert.equal(capture('  Buy milk  '),true);
 assert.deepEqual(data.tasks,[{id:'new',title:'Buy milk'}]);assert.equal(renders,1);assert.equal(messages.length,1);
 assert.equal(capture('  '),false);assert.equal(data.tasks.length,1);
});
test('Library filtering treats typed text literally and ignores case and outer whitespace',()=>{
 const matches=new Function(source('atlasLibraryMatches')+';return atlasLibraryMatches')();
 assert.equal(matches('Focus timer','Time to concentrate',' FOCUS '),true);
 assert.equal(matches('Money','Bills and balances','bills'),true);
 assert.equal(matches('Notes','Things worth keeping',''),true);
 assert.equal(matches('Notes','Things worth keeping','[.*'),false);
});
