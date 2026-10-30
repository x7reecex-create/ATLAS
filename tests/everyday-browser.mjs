import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sizes=[['small-android',320,568],['iphone',393,852],['samsung',412,915],['landscape',852,393],['tablet',820,1180],['desktop',1366,768]];
const base=process.env.ATLAS_TEST_URL||'http://127.0.0.1:8765';
async function screenshot(page,name){
 const buffer=await page.screenshot({type:'jpeg',quality:60,fullPage:true});
 const encoded=buffer.toString('base64');
 console.log('ATLAS_IMAGE_START '+name);
 for(let i=0;i<encoded.length;i+=10000)console.log('ATLAS_IMAGE_CHUNK '+encoded.slice(i,i+10000));
 console.log('ATLAS_IMAGE_END '+name);
}
try{
 for(const [name,width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<900,hasTouch:width<900,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-30T12:00:00Z'));
  await page.goto(base,{waitUntil:'load'});
  await page.locator('.atlas-welcome').waitFor();
  assert.equal(await page.locator('.atlas-greeting').innerText(),'Good afternoon.');
  assert.equal(await page.locator('.atlas-start-actions button').count(),3);
  assert.deepEqual(await page.locator('.atlas-day-stats strong').allTextContents(),['0','0','0']);
  assert.equal(await page.locator('#fab').innerText(),'＋\nAdd');
  await page.locator('.atlas-start-actions [data-action="new-task"]').click();
  assert.equal(await page.locator('#f-title').count(),1);
  await page.locator('[data-action="modal-close"]').click();
  if(['iphone','desktop'].includes(name))await screenshot(page,name+'-empty');

  await page.locator('#capture-text').fill('Pick up groceries');
  await page.locator('#capture-text').press('Enter');
  await page.locator('#capture-text').evaluate(el=>el.blur());
  assert.equal(await page.locator('.atlas-welcome').count(),0);
  assert.match(await page.locator('.signature-tasks').innerText(),/Pick up groceries/);
  await page.reload();
  await page.locator('.signature-tasks .task').waitFor();
  assert.match(await page.locator('.signature-tasks').innerText(),/Pick up groceries/);

  // Deliberate storage failure must leave the typed text available for retry.
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   window.restoreStorage=()=>{Storage.prototype.setItem=original};
   Storage.prototype.setItem=function(key,value){if(key==='atlas-preview:v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value)};
  });
  await page.locator('#capture-text').fill('Book a haircut');
  await page.locator('#capture-text').press('Enter');
  assert.equal(await page.locator('#capture-text').inputValue(),'Book a haircut');
  assert.match(await page.locator('#syncbar').innerText(),/not saved/);
  await page.evaluate(()=>window.restoreStorage());
  await page.locator('#capture-text').press('Enter');
  await page.locator('#capture-text').evaluate(el=>el.blur());
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.filter(t=>t.title==='Book a haircut').length),1);
  await page.getByRole('checkbox',{name:'Complete Book a haircut',exact:true}).click();
  assert.equal(await page.locator('[data-action="home-done"] strong').textContent(),'1');
  await page.locator('#fab').click();
  await page.locator('[data-action="capture-thought"]').click();
  await page.locator('#f-title').fill('Remember a birthday');
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   window.restoreStorage=()=>{Storage.prototype.setItem=original};
   Storage.prototype.setItem=function(key,value){if(key==='atlas-preview:v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value)};
  });
  await page.locator('#edit-form button[type="submit"]').click();
  assert.equal(await page.locator('#f-title').inputValue(),'Remember a birthday');
  assert.match(await page.locator('#form-error').innerText(),/not saved/);
  await page.evaluate(()=>window.restoreStorage());
  await page.locator('#edit-form button[type="submit"]').click();
  assert.equal(await page.locator('#edit-form').count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.filter(t=>t.title==='Remember a birthday').length),1);
  await page.locator('[data-action="home-calendar-today"]').click();
  assert.equal(await page.locator('#content').getAttribute('data-view'),'calendar');
  assert.equal(await page.locator('#cal-jump-date').inputValue(),'2026-10-30');

  await page.locator('#nav [data-page="library"]').click();
  const filter=page.locator('#atlas-library-filter');
  await filter.fill(' BILLs ');
  assert.equal(await page.locator('[data-library-item]:visible').count(),1);
  assert.match(await page.locator('[data-library-item]:visible').innerText(),/Money/);
  assert.equal(await filter.evaluate(el=>el===document.activeElement),true);
  await filter.fill('<img onerror=alert(1)>');
  assert.equal(await page.locator('[data-library-item]:visible').count(),0);
  assert.equal(await page.locator('#atlas-library-empty').isVisible(),true);
  await page.locator('[data-action="library-clear"]').click();
  assert.equal(await filter.inputValue(),'');
  assert.equal(await page.locator('[data-library-item]:visible').count(),12);
  await filter.fill('notes');
  await page.locator('[data-library-item]:visible').click();
  assert.equal(await page.locator('#nav [aria-current="page"]').getAttribute('data-page'),'library');
  await page.locator('.atlas-back').click();
  assert.equal(await filter.inputValue(),'');
  await filter.evaluate(el=>el.blur());
  await page.locator('#nav [data-page="home"]').click();

  // Synthetic records only. Existing preferences and names must survive the change.
  await page.evaluate(()=>{
   const key='atlas-preview:v1',data=JSON.parse(localStorage.getItem(key));
   data.displayName='Alex';
   data.tasks.push({id:'review-task',title:'Review this week’s spending',due:'2026-10-30',done:false,createdAt:1793361600000,priority:'high'},
    {id:'later-task',title:'Plan the summer trip',planned:'2027-01-01',focus:true,done:false,createdAt:1793361600000});
   data.calendarEvents.push({id:'coffee',title:'Coffee with a friend',startDate:'2026-10-30',startTime:'15:30',durationMins:60,allDay:false,repeat:'none',category:'personal',details:'',createdAt:1793361600000});
   localStorage.setItem(key,JSON.stringify(data));
  });
  await page.reload();
  await page.locator('.atlas-everyday').waitFor();
  assert.equal(await page.locator('.atlas-greeting').innerText(),'Good afternoon, Alex.');
  assert.deepEqual(await page.locator('.atlas-day-stats strong').allTextContents(),['1','1','1']);
  assert.match(await page.locator('.signature-next').innerText(),/Coffee with a friend/);
  assert.doesNotMatch(await page.locator('.signature-tasks').innerText(),/Plan the summer trip/);
  if(['iphone','desktop'].includes(name))await screenshot(page,name+'-populated');
  for(const theme of ['midnight','arctic','forest','ember','graphite']){
   await page.evaluate(theme=>{const key='atlas-preview:v1',d=JSON.parse(localStorage.getItem(key));d.theme=theme;d.appearance.textSize='extra';localStorage.setItem(key,JSON.stringify(d))},theme);
   await page.reload();await page.locator('.atlas-everyday').waitFor();
   const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('.atlas-day-stats button,.atlas-more-tasks,.atlas-library-link')].map(el=>{const r=el.getBoundingClientRect();return {height:r.height,left:r.left,right:r.right}})}));
   assert.ok(layout.scroll<=layout.width+2,name+' '+theme+' extra-large text has no overflow '+JSON.stringify(layout));
   assert.ok(layout.buttons.every(b=>b.height>=44&&b.left>=0&&b.right<=width+2),name+' '+theme+' controls fit and meet touch height');
  }
  assert.deepEqual(errors,[],name+' no JavaScript errors');
  console.log('PASS everyday '+name+' capture/persistence/retry/filter/navigation/themes/extra-large-text');
  await context.close();
 }
}finally{await browser.close()}
