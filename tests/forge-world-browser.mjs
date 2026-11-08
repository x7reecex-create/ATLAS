// Real Chromium integration check: tasks -> trail tokens -> exploration -> crafting -> reload.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');

const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.ATLAS_TEST_URL||'http://127.0.0.1:8765';
try{
 for(const width of [320,393,1366]){
  const context=await browser.newContext({viewport:{width,height:850},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'load'});
  await page.locator('#nav [data-page="gameScreen"]').click();
  await page.locator('[data-action="game-tab"][data-tab="world"]').click();
  assert.match(await page.locator('.forge-world-stats').innerText(),/0\s*Trail tokens ready/);
  assert.equal(await page.locator('.forge-world-tile.frontier:enabled').count(),0);
  await page.locator('[data-action="game-tab"][data-tab="todos"]').click();
  for(let i=1;i<=3;i++){
   await page.locator('[data-action="new-task"]').first().click();
   await page.locator('#f-title').fill('Forge fieldwork '+i);
   await page.locator('#edit-form button[type="submit"]').click();
   await page.getByRole('checkbox',{name:'Complete Forge fieldwork '+i,exact:true}).click();
  }
  await page.locator('[data-action="game-tab"][data-tab="world"]').click();
  assert.equal(await page.locator('.forge-world-tile.frontier:enabled').count(),2);
  for(const [tile,name] of [['1','Mossy Trail'],['2','Western Ridge'],['6','Copper Quarry']]){
   await page.locator(`.forge-world-tile[data-id="${tile}"]`).click();
   assert.match(await page.locator('.forge-world-discovery h3').innerText(),new RegExp(name));
  }
  assert.equal(await page.locator('.forge-world-tile.frontier:enabled').count(),0);
  assert.match(await page.locator('.forge-world-milestone.found').innerText(),/Quarry anvil/);
  await page.locator('[data-action="game-tab"][data-tab="forge"]').click();
  await page.locator('[data-action="game-craft"][data-id="anvil"]').click();
  assert.match(await page.locator('.forge-inventory').innerText(),/Quarry anvil/);
  await page.locator('.forge-room-tile[data-slot="4"]').click();
  assert.match(await page.locator('.forge-room-count').innerText(),/1 \/ 9/);
  await page.reload();
  await page.locator('#nav [data-page="gameScreen"]').click();
  await page.locator('[data-action="game-tab"][data-tab="world"]').click();
  assert.equal(await page.locator('.forge-world-tile.discovered').count(),4,'home plus three discoveries restored');
  await page.locator('[data-action="game-tab"][data-tab="forge"]').click();
  assert.match(await page.locator('.forge-room-count').innerText(),/1 \/ 9/);
  const geometry=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(geometry.scroll<=geometry.viewport+2,`no horizontal overflow at ${width}px: ${JSON.stringify(geometry)}`);
  assert.deepEqual(errors,[],`no browser errors at ${width}px`);
  console.log('PASS FORGE world '+width+'px: real task, discovery, craft, place and reload');
  await context.close();
 }
}finally{await browser.close()}
