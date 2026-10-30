import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const expr=script.match(/function atlasTaskSwipeIntent\(dx,dy\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(expr,'Swipe classifier exists');
const decide=new Function(expr+';return atlasTaskSwipeIntent;')();
test('swipe directions have deliberate thresholds and refuse diagonal scrolls',()=>{
 assert.equal(decide(120,8),'complete');
 assert.equal(decide(-130,10),'tomorrow');
 assert.equal(decide(75,0),'');
 assert.equal(decide(-75,0),'');
 assert.equal(decide(130,43),'');
 assert.equal(decide(120,85),'');
 assert.equal(decide(-200,151),'');
 assert.equal(decide(30,0),'');
});
test('gesture integration preserves accessible alternatives and cancellation',()=>{
 assert.doesNotThrow(()=>new Function(script));
 assert.match(html,/data-action="task-quick-menu"/);
 assert.match(html,/aria-label="More actions for/);
 assert.match(html,/function atlasOpenTaskMenu/);
 assert.match(html,/function atlasUndoLastTask/);
 assert.match(html,/function atlasUndoTimetableMove/);
 assert.match(html,/function atlasResetTaskPointer/);
 assert.match(html,/pointercancel/);
 assert.match(html,/touch-action:pan-y/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});
test('week and agenda swipes are separate and preserve system edge gesture area',()=>{
 assert.match(html,/unit:rail\?'week':'day'/);
 assert.match(html,/swipe\.unit==='week'\?7:1/);
 assert.match(html,/t\.clientX<24\|\|t\.clientX>innerWidth-24/);
});
test('timetable day changes remain reversible and desktop dragging is optional',()=>{
 assert.match(html,/data-timetable-drop-day=/);
 assert.match(html,/draggable="true"/);
 assert.match(html,/function atlasMoveTimetableBlock/);
 assert.match(html,/function atlasUndoTimetableMove/);
 assert.match(html,/Choose a valid category|Time conflict|overlaps another block/);
 assert.match(html,/Tap to edit or change the day/);
});
