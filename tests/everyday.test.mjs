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
test('a future focus item stays out of today unless explicitly planned today or already overdue',()=>{
 const tasks=[{id:'later',focus:true,planned:'2027-01-01'},{id:'future-deadline',focus:true,due:'2027-01-01'},{id:'today',planned:'2026-10-30',due:'2027-01-01'},{id:'overdue',planned:'2027-01-01',due:'2026-10-29'}];
 assert.deepEqual(picks(tasks,'2026-10-30').map(t=>t.id),['overdue','today']);
});
const editorSource=html.slice(html.indexOf('function saveEditor('),html.indexOf('function nextRecurring('));
test('modal capture keeps its editor open when saving fails',()=>{
 let closed=0;const data={tasks:[]};
 const edit=new Function('modalState','data','createTask','closeModal','commit','atlasCaptureTask','storageWarning',editorSource+';return saveEditor')({type:'quick'},data,title=>data.tasks.push({title}),()=>closed++,()=>false,()=>false,'Storage is full');
 assert.throws(()=>edit({title:'Remember this'}),/Storage is full/);
 assert.equal(closed,0);assert.equal(data.tasks.length,0);
});
test('clearing a name gives a neutral greeting instead of assigning a title',()=>{
 const data={displayName:'Alex'};
 const edit=new Function('modalState','data','closeModal','commit',editorSource+';return saveEditor')({type:'name'},data,()=>{},()=>{});
 edit({name:'  '});assert.equal(data.displayName,'');
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
