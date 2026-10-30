import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
test('JavaScript parses and timetable is linked through Library and Calendar',()=>{
 assert.doesNotThrow(()=>new Function(source));
 for(const name of ['timetable','atlasTimetableSave','atlasTimetableEditor','atlasTimetableBlocks','atlasTimetableDelete'])assert.match(html,new RegExp('function '+name+'\\('));
 assert.match(html,/data-page="\$\{pg\}"/);
 assert.match(html,/\['timetable','Timetable'/);
 assert.match(html,/btn\('Timetable','goto-timetable'/);
});
test('appearance styles stay within validated choices and defaults',()=>{
 assert.match(html,/fontStyle:\['native','rounded','crisp'\]/);
 assert.match(html,/textSize:\['standard','large','extra'\]/);
 assert.match(html,/atlas-font-style-select/);
 assert.match(html,/atlas-appearance-preset|appearance-preset/);
 assert.match(html,/atlas-style-preview/);
 assert.match(html,/data-atlas-font-style="rounded"/);
 assert.match(html,/data-atlas-text-size="extra"/);
});
test('timetable blocks use Calendar events, preserving existing backups',()=>{
 assert.match(html,/timetable:true,title,details:/);
 assert.match(html,/repeat:'weekly'/);
 assert.match(html,/calValidateEvent\(\{/);
 assert.match(html,/data\.calendarEvents\.push\(candidate\)/);
 assert.match(html,/End time must be 5 minutes to 12 hours after the start/);
 assert.match(html,/e\.timetable===true&&e\.repeat==='weekly'/);
});
test('small privacy banner no longer fills the screen unnecessarily',()=>{
 assert.match(html,/bar\.textContent=storageLoadError\|\|storageWarning\|\|\(bridgeProfile\?/);
 assert.match(html,/\.syncbar\{display:none/);
 assert.match(html,/\.syncbar:not\(:empty\)\{display:block\}/);
});
