// Browser-only FORGE acceptance check. Runs against a local static server.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser=await chromium.launch({
 ...(process.env.ATLAS_CHROME_PATH?{executablePath:process.env.ATLAS_CHROME_PATH}:{channel:'chrome'}),
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']
});
try {
 for(const width of [320,393,820]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.locator('#nav button[data-page="gameScreen"]').click();
  await page.locator('[data-action="game-tab"][data-tab="forge"]').click();
  assert.equal(await page.locator('.forge-world-tile').count(),81);
  assert.match(await page.locator('.forge-screen').innerText(),/Hearthvale/);
  const documentOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(documentOverflow<=2,`${width}px FORGE does not overflow viewport: ${documentOverflow}`);
  await page.locator('.forge-world-tile[data-x="4"][data-y="4"]').click();
  await page.locator('[data-action="game-forge-view"][data-view="workshop"]').last().click();
  assert.equal(await page.locator('.forge-room-tile').count(),9);
  await page.locator('[data-action="game-forge-view"][data-view="world"]').click();
  await page.locator('.forge-world-tile[data-x="1"][data-y="7"]').click();
  assert.match(await page.locator('.forge-location-card').innerText(),/Quest Board/);
  // Create a real task through Home, then complete it from the in-world board.
  await page.locator('#nav button[data-page="home"]').click();
  await page.locator('#capture-text').fill('Tidy the workbench');
  await page.locator('#capture button[type="submit"]').click();
  await page.locator('#nav button[data-page="gameScreen"]').click();
  await page.locator('[data-action="game-tab"][data-tab="forge"]').click();
  // Completing the task immediately rerenders the board, removing the checkbox.
  await page.locator('.forge-board-list input[data-action="toggle-task"]').click();
  const state=await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('atlas-preview:v1'));return {task:data.tasks[0].done,awards:data.game.awards.length,world:data.game.world}});
  assert.equal(state.task,true);
  assert.equal(state.awards,1);
  assert.ok(state.world.visited.includes('Q'));
  await page.reload();
  await page.locator('#nav button[data-page="gameScreen"]').click();
  await page.locator('[data-action="game-tab"][data-tab="forge"]').click();
  const restored=await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('atlas-preview:v1'));return {task:data.tasks[0].done,awards:data.game.awards.length,world:data.game.world}});
  assert.deepEqual(restored,state,`${width}px exploration and task progress persist`);
  assert.deepEqual(errors,[],`${width}px no runtime errors`);
  await context.close();
 }
}finally{await browser.close()}
