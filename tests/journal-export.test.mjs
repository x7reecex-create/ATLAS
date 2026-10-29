import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const begin=html.indexOf('/* Private, human-readable export.');
const end=html.indexOf('function atlasJournalHasUnsavedChanges(){',begin);
assert.ok(begin>=0&&end>begin,'journal text exporter is present');
const moods=[['great','Great',5],['good','Good',4],['okay','Okay',3],['low','Low',2],['rough','Rough',1]];
const api=vm.runInNewContext(html.slice(begin,end)+';atlasJournalTextExport', {
 atlasJournalMood:value=>moods.find(m=>m[0]===value)||moods[2]
});

test('journal text export preserves Unicode, paragraphs and chronological dates',()=>{
 const result=api([
  {journalDate:'2026-10-29',mood:'good',energy:4,tags:['family','🌿'],body:'Hello 🌿\nSecond line'},
  {journalDate:'2026-10-28',mood:'rough',energy:1,tags:[],body:'First day\rSecond line'}
 ]);
 assert.match(result,/Saved entries: 2/);
 assert.ok(result.indexOf('Date: 2026-10-28')<result.indexOf('Date: 2026-10-29'));
 assert.match(result,/First day\nSecond line/);
 assert.match(result,/Hello 🌿\nSecond line/);
 assert.match(result,/Tags: family, 🌿/);
 assert.match(result,/Mood: Rough[\s\S]*Energy: 1\/5/);
});
test('export is plain text with no workspace or account metadata',()=>{
 const result=api([{journalDate:'2026-10-29',mood:'okay',energy:3,tags:[],body:'Private note'}]);
 assert.match(result,/Private note/);
 assert.doesNotMatch(result,/"notes"|"tasks"|"bridgeSession"|"balanceHistory"/);
 assert.match(html,/const entries=atlasJournalEntries\(\);\n if\(!entries.length\)return showToast/,'download is sourced only from saved journal entries');
 assert.match(html,/data-action="journal-export"/,'journal export is available in UI');
});
