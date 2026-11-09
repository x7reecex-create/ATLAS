// Failed browser writes must never produce phantom Journey progress or lost rewards.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.ATLAS_TEST_URL||'http://127.0.0.1:8765';
const key='atlas-preview:v1';
try{
 for(const width of [320,393,1366]){
  const context=await browser.newContext({viewport:{width,height:852},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const failNextSave=()=>page.evaluate(k=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(name,value){
    if(name===k){Storage.prototype.setItem=original;throw new DOMException('Test quota failure','QuotaExceededError')}
    return original.call(this,name,value);
   };
  },key);
  await page.goto(base,{waitUntil:'load'});
  await page.locator('#nav [data-page="gameScreen"]').click();
  await page.getByRole('tab',{name:'Habits',exact:true}).click();
  await page.locator('[data-action="ins-new"][data-kind="habit"]').first().click();
  await page.locator('#ins-edit-form [name="title"]').fill('Save safety habit');
  await page.locator('#ins-edit-form button[type="submit"]').click();
  const check=()=>page.getByRole('button',{name:'Check in to Save safety habit',exact:true});
  const undo=()=>page.getByRole('button',{name:/Undo today.s check-in for Save safety habit/});
  await failNextSave();await check().click();
  assert.equal((await saved()).habitLogs.length,0,'failed check-in cannot persist a habit log');
  assert.equal((await saved()).game.awards.length,0,'failed check-in cannot persist XP');
  await page.getByRole('tab',{name:'Rewards',exact:true}).click();
  await page.getByRole('tab',{name:'Habits',exact:true}).click();
  assert.equal(await check().getAttribute('aria-pressed'),'false','failed check-in also rolls back memory');
  await check().click();
  assert.equal((await saved()).habitLogs.length,1);
  assert.equal((await saved()).game.awards.length,1);
  await failNextSave();await undo().click();
  assert.equal((await saved()).habitLogs.length,1,'failed undo preserves saved check-in');
  await page.getByRole('tab',{name:'Rewards',exact:true}).click();
  await page.getByRole('tab',{name:'Habits',exact:true}).click();
  assert.equal(await undo().getAttribute('aria-pressed'),'true','failed undo also rolls back memory');
  await undo().click();await check().click();
  assert.equal((await saved()).game.awards.length,1,'rechecking same day cannot duplicate XP');

  await page.getByRole('tab',{name:'Rewards',exact:true}).click();
  await page.locator('[data-action="game-add-reward"]').click();
  await page.locator('#game-reward-form [name="title"]').fill('Test treat');
  await page.locator('#game-reward-form [name="cost"]').fill('10');
  await failNextSave();
  await page.locator('#game-reward-form button[type="submit"]').click();
  assert.equal((await saved()).game.rewards.length,0,'failed reward creation cannot persist');
  assert.equal(await page.locator('#game-reward-form').count(),1,'failed creation keeps the editor for retry');
  await page.locator('#game-reward-form button[type="submit"]').click();
  let reward=(await saved()).game.rewards[0];
  assert.equal(reward.title,'Test treat');
  assert.equal(await page.locator('#game-reward-form').count(),0);
  const remove=()=>page.locator(`[data-action="game-remove-reward"][data-id="${reward.id}"]`);
  await failNextSave();page.once('dialog',dialog=>dialog.accept());await remove().click();
  assert.equal((await saved()).game.rewards.length,1,'failed removal cannot delete saved reward');
  await page.getByRole('tab',{name:'Habits',exact:true}).click();
  await page.getByRole('tab',{name:'Rewards',exact:true}).click();
  assert.equal(await remove().count(),1,'failed removal preserves the rendered reward');
  page.once('dialog',dialog=>dialog.accept());await remove().click();
  assert.equal((await saved()).game.rewards.length,0);

  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const toggle=()=>page.locator('[data-action="game-toggle"]').first();
  await failNextSave();await toggle().click();
  assert.equal((await saved()).game.enabled,true,'failed pause does not persist');
  await page.locator('#nav [data-page="gameScreen"]').click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  assert.equal(await toggle().innerText(),'Pause','failed pause also restores memory');
  await toggle().click();assert.equal((await saved()).game.enabled,false);
  await failNextSave();await toggle().click();
  assert.equal((await saved()).game.enabled,false,'failed resume does not persist');
  await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();
  assert.equal(await toggle().innerText(),'Enable');
  await toggle().click();assert.equal((await saved()).game.enabled,true);
  const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll<=layout.width+2,'no document overflow '+width);
  assert.deepEqual(errors,[]);
  console.log(`PASS Journey save rollback ${width}px: habits, custom rewards, pause/resume, reload`);
  await context.close();
 }
}finally{await browser.close()}
