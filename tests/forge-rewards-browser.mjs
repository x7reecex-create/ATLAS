// Real COMMAND tasks earn coins; a failed reward save must leave them spendable.
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
  await page.goto(base,{waitUntil:'load'});
  await page.locator('#nav [data-page="gameScreen"]').click();
  await page.getByRole('tab',{name:'To-dos'}).click();
  for(let n=1;n<=5;n++){
   await page.locator('[data-action="new-task"]').first().click();
   await page.locator('#f-title').fill('Reward audit '+n);
   await page.locator('#edit-form button[type="submit"]').click();
   await page.getByRole('checkbox',{name:'Complete Reward audit '+n,exact:true}).click();
  }
  await page.getByRole('tab',{name:'Rewards'}).click();
  const claim=page.locator('[data-action="game-claim"][data-id="break"]');
  assert.equal(await page.locator('.quest-coins').innerText(),'◈55 coins');
  page.once('dialog',dialog=>dialog.accept());
  await claim.click();
  assert.equal(await page.locator('.quest-coins').innerText(),'◈35 coins');
  const before=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.evaluate(key=>{
   const original=Storage.prototype.setItem;
   window.restoreRewardStorage=()=>{Storage.prototype.setItem=original;};
   Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Audit quota failure','QuotaExceededError');return original.call(this,k,v);};
  },key);
  page.once('dialog',dialog=>dialog.accept());
  await claim.click();
  assert.match(await page.locator('#toast').innerText(),/not saved/i);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before);
  // Force a fresh render: an unchanged stale label alone cannot prove rollback.
  await page.getByRole('tab',{name:'To-dos'}).click();
  await page.getByRole('tab',{name:'Rewards'}).click();
  assert.equal(await page.locator('.quest-coins').innerText(),'◈35 coins');
  await page.evaluate(()=>window.restoreRewardStorage());
  page.once('dialog',dialog=>dialog.dismiss());
  await claim.click();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before,'cancelled claim leaves save intact');
  page.once('dialog',dialog=>dialog.accept());
  await claim.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.quest-coins').innerText(),'◈15 coins');
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  assert.equal(saved.game.claims.length,2,'only the two successful redemptions persist');
  assert.equal(saved.game.awards.length,6,'task and milestone rewards stay intact');
  await page.reload();
  await page.locator('#nav [data-page="gameScreen"]').click();
  await page.getByRole('tab',{name:'Rewards'}).click();
  assert.equal(await page.locator('.quest-coins').innerText(),'◈15 coins');
  assert.equal(await claim.isDisabled(),true,'insufficient coins disables another redemption');
  const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll<=layout.width+2,`no overflow at ${width}px`);
  assert.deepEqual(errors,[]);
  console.log(`PASS reward persistence ${width}px: real tasks, quota failure, cancel, keyboard retry, reload`);
  await context.close();
 }
}finally{await browser.close();}
