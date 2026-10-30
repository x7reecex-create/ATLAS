import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
test('Gesture update parses and keeps access to original task controls',()=>{
 assert.ok(script);assert.doesNotThrow(()=>new Function(script));
 for(const control of ['data-action="focus"','data-action="plan"','data-action="task-menu"','data-action="atlas-undo"'])assert.ok(html.includes(control)||control==='data-action="atlas-undo"');
 assert.match(html,/atlasUndoGesture\(\)/);
});
test('Swipe is conservative and cannot override edge navigation or vertical scrolling',()=>{
 assert.match(html,/e\.clientX<28\|\|e\.clientX>innerWidth-28/);
 assert.match(html,/Math\.abs\(dx\)<84/);
 assert.match(html,/Math\.abs\(dy\)>44/);
 assert.match(html,/Math\.abs\(x\.dy\)>16/);
 assert.match(html,/\.taskbody\{touch-action:pan-y\}/);
 assert.match(html,/pointercancel/);
 assert.match(html,/atlasGestureClickBlockUntil/);
});
test('Task actions have Undo and do not erase existing recurring tasks on completion',()=>{
 assert.match(html,/function atlasQuickTask\(ref,action\)/);
 assert.match(html,/toggleTask\(ref,true\)/);
 assert.match(html,/record\.created/);
 assert.match(html,/if\(!t\|\|!t\.done\|\|t\.completedAt!==record\.stamp/);
 assert.match(html,/function atlasTaskMenu\(ref\)/);
 assert.match(html,/role="dialog" aria-modal="true" aria-label="Task actions"/);
});
test('Timetable move works for weekly blocks and has pointer, mouse and keyboard alternatives',()=>{
 assert.match(html,/event\.timetable!==true\|\|event\.repeat!=='weekly'/);
 assert.match(html,/const before=event\.startDate,after=dateAdd\(calStartWeek\(before\),day\)/);
 assert.match(html,/data-atlas-day=/);
 assert.match(html,/draggable="true"/);
 assert.match(html,/atlas-timetable-grip/);
 assert.match(html,/dragstart/);
 assert.match(html,/dragover/);
 assert.match(html,/e\.altKey/);
});
