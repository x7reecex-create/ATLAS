import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const extract=name=>{
 const re=new RegExp('function '+name+'\\(tasks,day\\)\\{[\\s\\S]*?\\n\\}');
 const found=html.match(re);assert.ok(found,'Missing '+name);
 return new Function('byPriority',found[0]+';return '+name+';')((a,b)=>a.order-b.order);
};
const buckets=extract('atlasTodayBuckets');
const home=extract('atlasHomePicks');
const samples=[
 {id:'focus-due',title:'Focused overdue',focus:true,due:'2026-10-28',planned:'2026-10-29',stage:'planned',done:false,order:1},
 {id:'due',title:'Urgent',focus:false,due:'2026-10-29',planned:'2026-10-29',stage:'planned',done:false,order:2},
 {id:'planned',title:'Scheduled',focus:false,due:'',planned:'2026-10-29',stage:'planned',done:false,order:3},
 {id:'inbox',title:'Inbox',focus:false,due:'',planned:'',stage:'inbox',done:false,order:4},
 {id:'done',title:'Done',focus:true,due:'2026-10-27',planned:'2026-10-29',stage:'planned',done:true,order:5}
];
test('Today places each open task in only one section',()=>{
 const out=buckets(samples,'2026-10-29');
 assert.deepEqual(out.focus.map(x=>x.id),['focus-due']);
 assert.deepEqual(out.due.map(x=>x.id),['due']);
 assert.deepEqual(out.planned.map(x=>x.id),['planned']);
 assert.deepEqual(out.inbox.map(x=>x.id),['inbox']);
 assert.equal(new Set(Object.values(out).flat().map(x=>x.id)).size,4);
});
test('Home shows urgent work even when focus tasks exist',()=>{
 const urgent=[{id:'focus',focus:true,due:'',planned:'',done:false,order:0},...samples];
 const chosen=home(urgent,'2026-10-29');
 assert.deepEqual(chosen.map(x=>x.id),['focus-due','due','focus']);
});
test('planning is reversible and task controls have names',()=>{
 assert.match(html,/wasToday\?'':'calLondonToday\(\)/);
 assert.match(html,/Remove from today/);
 assert.match(html,/aria-pressed="\$\{t\.planned===calLondonToday\(\)\}"/);
 assert.match(html,/aria-label="Your task overview"/);
 assert.match(html,/atlas-task-card \.taskactions \.micro\{min-width:44px;min-height:44px\}/);
 assert.match(html,/aria-pressed="\$\{view===v\}"/);
});
