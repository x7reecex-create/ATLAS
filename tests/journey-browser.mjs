import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');

const browser=await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH||undefined,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage']
});
const base=process.env.ATLAS_TEST_URL||'http://127.0.0.1:8765';

try{
  for(const width of [320,393,820]){
    const context=await browser.newContext({viewport:{width,height:852},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base,{waitUntil:'load'});
    await page.locator('#nav [data-page="gameScreen"]').click();
    assert.match(await page.locator('.quest-profile-main').innerText(),/Lvl 1/);
    assert.equal(await page.locator('.quest-coins').innerText(),'◈0 coins');

    await page.locator('[data-action="ins-new"][data-kind="habit"]').first().click();
    await page.locator('#f-title').fill('Read ten pages');
    await page.locator('#ins-edit-form button[type="submit"]').click();
    await page.locator('.quest-habit-button').click();
    assert.match(await page.locator('.quest-hero').innerText(),/10 total XP earned/);
    await page.locator('.quest-habit-button').click();
    await page.locator('.quest-habit-button').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).game.awards.length),1,'same habit and day earns only once');

    await page.locator('[data-action="game-tab"][data-tab="todos"]').click();
    for(let n=1;n<=4;n++){
      await page.locator('[data-action="new-task"]').first().click();
      await page.locator('#f-title').fill('Test quest '+n);
      await page.locator('#edit-form button[type="submit"]').click();
      await page.getByRole('checkbox',{name:'Complete Test quest '+n,exact:true}).click();
    }
    assert.match(await page.locator('.quest-objective').innerText(),/Bonus unlocked/);
    const game=await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).game);
    assert.equal(game.awards.length,6,'five unique actions plus milestone');
    assert.equal(game.awards.reduce((v,a)=>v+a.xp,0),140);
    assert.equal(game.awards.reduce((v,a)=>v+a.coins,0),53);
    await page.getByRole('checkbox',{name:'Reopen Test quest 4',exact:true}).click();
    await page.getByRole('checkbox',{name:'Complete Test quest 4',exact:true}).click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).game.awards.length),6,'reopening does not farm awards');

    await page.locator('[data-action="game-tab"][data-tab="rewards"]').click();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-action="game-claim"][data-id="break"]').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).game.claims.length),1);
    await page.reload();
    await page.locator('#nav [data-page="gameScreen"]').click();
    assert.match(await page.locator('.quest-hero').innerText(),/140 total XP earned/);
    const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(layout.scroll<=layout.width+2,'no horizontal overflow at '+width+'px '+JSON.stringify(layout));
    assert.deepEqual(errors,[],'no page errors at '+width+'px');
    await context.close();
  }
}finally{await browser.close()}
