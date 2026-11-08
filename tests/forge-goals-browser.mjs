import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.ATLAS_TEST_URL||'http://127.0.0.1:8765';
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')));
try{
 for(const [width,height] of [[320,568],[393,852],[412,915],[852,393],[820,1180],[1366,768]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'load'});
  await page.locator('#nav [data-page="gameScreen"]').click();
  await page.getByRole('tab',{name:'Workshop',exact:true}).click();
  await page.getByRole('button',{name:'Track Ember lantern',exact:true}).click();
  assert.equal((await state(page)).game.craftGoal,'lamp');
  assert.match(await page.locator('.forge-goal').innerText(),/2 new tasks \+ 2 new habit check-ins/);
  await page.reload();
  await page.locator('#nav [data-page="gameScreen"]').click();
  assert.match(await page.locator('.forge-goal h2').innerText(),/Ember lantern/);
  await page.locator('.forge-goal summary').click();
  await page.getByRole('button',{name:/Find a task/}).click();
  assert.equal(await page.getByRole('tab',{name:'To-dos',exact:true}).getAttribute('aria-selected'),'true');
  for(let i=1;i<=2;i++){
   await page.locator('[data-action="new-task"]').first().click();
   await page.locator('#f-title').fill('Goal test task '+i);
   await page.locator('#edit-form button[type="submit"]').click();
   await page.getByRole('checkbox',{name:'Complete Goal test task '+i,exact:true}).click();
  }
  assert.match(await page.locator('.forge-goal-status').innerText(),/50%/);
  await page.getByRole('checkbox',{name:'Reopen Goal test task 2',exact:true}).click();
  await page.getByRole('checkbox',{name:'Complete Goal test task 2',exact:true}).click();
  assert.equal((await state(page)).game.awards.length,2,'reopened task earns no extra goal materials');
  await page.locator('.forge-goal summary').click();
  await page.getByRole('button',{name:/Check in to a habit/}).click();
  for(let i=1;i<=2;i++){
   await page.locator('[data-action="ins-new"][data-kind="habit"]').first().click();
   await page.locator('#f-title').fill('Goal test habit '+i);
   await page.locator('#ins-edit-form button[type="submit"]').click();
   await page.getByRole('button',{name:'Check in to Goal test habit '+i,exact:true}).click();
  }
  assert.match(await page.locator('.forge-goal-status').innerText(),/Ready to craft/);
  if(width===393){
   const shot=(await page.locator('.forge-goal').screenshot({type:'jpeg',quality:70})).toString('base64');
   console.log('FORGE_IMAGE_START');
   for(let i=0;i<shot.length;i+=10000)console.log('FORGE_IMAGE_CHUNK '+shot.slice(i,i+10000));
   console.log('FORGE_IMAGE_END');
  }
  await page.locator('.forge-goal summary').click();
  await page.getByRole('button',{name:'Craft Ember lantern',exact:true}).click();
  let saved=await state(page);
  assert.equal(saved.game.craftGoal,'');assert.equal(saved.game.crafted.length,1);assert.equal(saved.game.crafted[0].recipeId,'lamp');
  assert.equal(await page.getByRole('tab',{name:'Workshop',exact:true}).getAttribute('aria-selected'),'true');
  await page.getByRole('button',{name:'Place Ember lantern in space 5',exact:true}).click();
  assert.equal((await state(page)).game.crafted[0].slot,'5');
  await page.getByRole('button',{name:'Track Timber bed',exact:true}).click();
  const tracked=(await state(page)).game;
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){
    if(key==='atlas-preview:v1'){
     Storage.prototype.setItem=original;
     throw new DOMException('Test storage full','QuotaExceededError');
    }
    return original.call(this,key,value);
   };
  });
  await page.getByRole('button',{name:'Track Woven rug',exact:true}).click();
  assert.equal((await state(page)).game.craftGoal,'bed','failed goal save preserves previous storage');
  assert.equal(await page.locator('.forge-goal h2').innerText(),'Timber bed','failed goal save preserves previous screen');
  await page.getByRole('button',{name:'Track Woven rug',exact:true}).click();
  assert.equal((await state(page)).game.craftGoal,'rug');
  await page.locator('.forge-goal').getByRole('button',{name:'Stop tracking Woven rug',exact:true}).click();
  assert.equal((await state(page)).game.craftGoal,'');
  await page.getByRole('button',{name:'Track Timber bed',exact:true}).click();
  await page.reload();await page.locator('#nav [data-page="gameScreen"]').click();
  assert.deepEqual((await state(page)).game,tracked,'goal and workshop survive reload together');
  await page.evaluate(()=>{
   const d=JSON.parse(localStorage.getItem('atlas-preview:v1'));
   d.game.craftGoal='retired-blueprint';
   localStorage.setItem('atlas-preview:v1',JSON.stringify(d));
  });
  await page.reload();await page.locator('#nav [data-page="gameScreen"]').click();
  assert.equal(await page.locator('.forge-goal').count(),0,'unknown goal does not block loading');
  await page.getByRole('tab',{name:'Workshop',exact:true}).click();
  await page.getByRole('button',{name:'Track Timber bed',exact:true}).focus();
  await page.keyboard.press('Enter');
  assert.equal((await state(page)).game.craftGoal,'bed','keyboard can track a goal after recovery');
  assert.deepEqual((await state(page)).game.awards,tracked.awards,'recovery preserves earned history');
  assert.deepEqual((await state(page)).game.crafted,tracked.crafted,'recovery preserves the room');
  const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll<=layout.width+2,'no horizontal overflow '+width+': '+JSON.stringify(layout));
  await page.evaluate(()=>document.documentElement.setAttribute('data-atlas-text-size','extra'));
  const large=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(large.scroll<=large.width+2,'no enlarged text overflow '+width);
  if(process.env.ATLAS_SCREENSHOT_DIR&&width===393)await page.screenshot({path:process.env.ATLAS_SCREENSHOT_DIR+'/forge-goal-workshop.png',fullPage:true});
  assert.deepEqual(errors,[],'no browser errors '+width);
  console.log('FORGE crafting goal flow passed at '+width+'×'+height);
  await context.close();
 }
}finally{await browser.close()}
