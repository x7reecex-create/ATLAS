import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/function atlasHomeStatus\(due,focus,planned,open\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(source,'status helper exists');
const homeStatus=new Function(source+';return atlasHomeStatus;')();

test('home messages match real workload, with correct singular and plural',()=>{
 assert.deepEqual(homeStatus(1,0,0,1),{kind:'attention',message:'1 task due or overdue. Start with one.'});
 assert.match(homeStatus(2,3,1,8).message,/2 tasks due or overdue/);
 assert.match(homeStatus(0,2,1,2).message,/2 tasks to focus/);
 assert.match(homeStatus(0,0,1,1).message,/1 task planned/);
 assert.match(homeStatus(0,0,0,3).message,/3 tasks on your list/);
 assert.equal(homeStatus(0,0,0,0).kind,'clear');
});
test('the home screen is useful when no tasks are selected',()=>{
 assert.match(html,/open\.length\?'Choose a task':'Add a task'/);
 assert.match(html,/data-action="\$\{open\.length\?'goto-today':'new-task'\}"/);
 assert.match(html,/signature-home-note \$\{homeStatus\.kind\}/);
 assert.doesNotMatch(html,/Everything important\. Nothing in the way\./);
});
test('human language does not remove existing access and privacy controls',()=>{
 assert.match(html,/data-action="goto-projects"/);
 assert.match(html,/data-action="goto-notes"/);
 assert.match(html,/data-action="goto-money"/);
 assert.match(html,/Stored on this device\. Export backups in Settings\./);
 assert.match(html,/prefers-reduced-motion:reduce/);
});
