import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function atlasJournalHasUnsavedChanges(){');
const end=html.indexOf('function journal(){',start);
assert.ok(start>=0&&end>start,'journal navigation guard is present');

function harness(saved){
 const fields={body:saved?.body||'',mood:saved?.mood||'okay',energy:String(saved?.energy||3),tags:(saved?.tags||[]).join(', ')};
 let confirmations=0,allow=false,beforeUnload=null;
 const context={
  page:'journal',atlasJournalDate:'2026-10-29',
  atlasJournalEntries:()=>saved?[{...saved,journalDate:'2026-10-29'}]:[],
  $:()=>({elements:{namedItem:name=>({value:fields[name]})}}),
  confirm:()=>{confirmations++;return allow;},
  window:{addEventListener:(name,listener)=>{if(name==='beforeunload')beforeUnload=listener;}}
 };
 const api=vm.runInNewContext(html.slice(start,end)+';({atlasJournalHasUnsavedChanges,atlasJournalConfirmDiscard})',context);
 return {api,fields,context,get confirmations(){return confirmations},allow:()=>{allow=true},beforeUnload:()=>beforeUnload};
}

test('unchanged saved entry and empty new entry do not prompt',()=>{
 const saved=harness({body:'My day',mood:'good',energy:4,tags:['family']});
 assert.equal(saved.api.atlasJournalHasUnsavedChanges(),false);
 assert.equal(saved.api.atlasJournalConfirmDiscard(),true);
 assert.equal(saved.confirmations,0);
 const blank=harness(null);
 assert.equal(blank.api.atlasJournalHasUnsavedChanges(),false);
 blank.fields.body='New writing';
 assert.equal(blank.api.atlasJournalHasUnsavedChanges(),true);
});

test('body and metadata changes require confirmation and cancellation preserves values',()=>{
 const h=harness({body:'Original',mood:'okay',energy:3,tags:['work']});
 h.fields.body='Edited';
 assert.equal(h.api.atlasJournalHasUnsavedChanges(),true);
 assert.equal(h.api.atlasJournalConfirmDiscard(),false);
 assert.equal(h.fields.body,'Edited');
 assert.equal(h.confirmations,1);
 h.allow();
 assert.equal(h.api.atlasJournalConfirmDiscard(),true);
 h.fields.body='Original';
 h.fields.mood='good';
 assert.equal(h.api.atlasJournalHasUnsavedChanges(),true);
 h.fields.mood='okay';
 h.fields.tags='family';
 assert.equal(h.api.atlasJournalHasUnsavedChanges(),true);
 h.fields.tags='work';
 h.fields.energy='5';
 assert.equal(h.api.atlasJournalHasUnsavedChanges(),true);
});

test('reload protection only activates with unsaved Journal changes',()=>{
 const h=harness({body:'Saved'});
 const event=()=>({defaultPrevented:false,preventDefault(){this.defaultPrevented=true},returnValue:undefined});
 let e=event();h.beforeUnload()(e);
 assert.equal(e.defaultPrevented,false);
 h.fields.body='Unsaved';
 e=event();h.beforeUnload()(e);
 assert.equal(e.defaultPrevented,true);
 assert.equal(e.returnValue,'');
 h.context.page='home';
 assert.equal(h.api.atlasJournalHasUnsavedChanges(),false);
});
