// Browser-only smoke suite. Runs in GitHub Actions, not in the app bundle.
// Playwright is installed in CI and is never a production dependency.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const sizes = [
  {name:'small-android',width:320,height:568},
  {name:'iphone',width:393,height:852},
  {name:'samsung',width:412,height:915},
  {name:'iphone-landscape',width:852,height:393},
  {name:'tablet',width:820,height:1180},
  {name:'desktop',width:1366,height:768},
];
try {
  for (const size of sizes) {
    const mobile = size.width < 900;
    const context = await browser.newContext({
      viewport: { width:size.width, height:size.height },
      reducedMotion: 'reduce',
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-29T12:00:00Z'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console',message=>{if(message.text().includes('ATLAS data recovery diagnosis'))console.log(size.name+' recovery:',message.text())});
    await page.goto('http://127.0.0.1:8765/index.html', {waitUntil:'load'});
    await page.locator('#nav button[data-page="home"]').waitFor({timeout:12000});
    assert.equal(await page.locator('#content').getAttribute('data-view'),'home',size.name+' home route');
    if (mobile && size.width < size.height) {
      const nav=page.locator('#nav'),fab=page.locator('#fab');
      assert.notEqual(await nav.evaluate(el=>getComputedStyle(el).display),'none',size.name+' nav initially visible');
      assert.notEqual(await fab.evaluate(el=>getComputedStyle(el).display),'none',size.name+' capture initially visible');
      const capture=page.locator('#capture-text');
      await capture.focus();
      await page.waitForFunction(()=>document.body.classList.contains('atlas-mobile-editing'));
      assert.equal(await nav.evaluate(el=>getComputedStyle(el).display),'none',size.name+' nav clears typing space');
      assert.equal(await fab.evaluate(el=>getComputedStyle(el).display),'none',size.name+' floating button clears typing space');
      const font=await capture.evaluate(el=>getComputedStyle(el).fontSize);
      assert.ok(parseFloat(font)>=16,size.name+' input does not trigger iOS zoom');
      await capture.evaluate(el=>el.blur());
      await page.waitForFunction(()=>!document.body.classList.contains('atlas-mobile-editing'));
      assert.notEqual(await nav.evaluate(el=>getComputedStyle(el).display),'none',size.name+' nav restores after text entry');
      assert.notEqual(await fab.evaluate(el=>getComputedStyle(el).display),'none',size.name+' floating capture restores after text entry');
    }
    // Exercise the actual Settings control, then verify the persisted preference.
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="settings"]').click();
    if (mobile && size.width < size.height) {
      // Native option pickers must not masquerade as a text keyboard and hide navigation.
      const picker=page.locator('#atlas-text-size-select');
      await picker.focus();
      assert.equal(await page.locator('#nav').evaluate(el=>getComputedStyle(el).display!=='none'),true,size.name+' bottom navigation remains available with picker focused');
      assert.equal(await page.evaluate(()=>document.body.classList.contains('atlas-mobile-editing')),false,size.name+' picker focus does not activate keyboard layout');
    }
    await page.locator('#atlas-text-size-select').selectOption('large');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('atlas-preview:v1')||'null')?.appearance?.textSize === 'large');
    await page.reload();
    await page.locator('#nav button[data-page="home"]').waitFor();
    const afterReload=await page.evaluate(()=>({display:document.documentElement.dataset.atlasTextSize,stored:JSON.parse(localStorage.getItem('atlas-preview:v1')||'null')?.appearance,warning:document.getElementById('syncbar')?.textContent}));
    assert.equal(afterReload.display,'large',size.name+' larger text persists after reload: '+JSON.stringify(afterReload));
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="settings"]').click();
    await page.locator('#atlas-font-style-select').selectOption('rounded');
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.atlasFontStyle),'rounded',size.name+' font style applied');
    await page.locator('#content button[data-action="appearance-preset"][data-preset="soft"]').click();
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.atlasTheme),'graphite',size.name+' preset changes palette');
    await page.locator('#atlas-text-size-select').selectOption('large');
    await page.locator('#nav button[data-page="home"]').click();
    const largeTextGeometry=await page.evaluate(() => {
      const nav=document.querySelector('#nav');
      const buttons=[...nav.querySelectorAll('button')].filter(el=>getComputedStyle(el).display!=='none');
      return {
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        navButtons:buttons.length,
        navVisible:getComputedStyle(nav).display!=='none',
        buttonBounds:buttons.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};}),
      };
    });
    assert.ok(largeTextGeometry.overflow<=2,size.name+' larger text never creates horizontal document overflow');
    assert.ok(largeTextGeometry.navVisible&&largeTextGeometry.navButtons>0,size.name+' larger text preserves navigation');
    assert.ok(largeTextGeometry.buttonBounds.every(r=>r.left>=-2&&r.right<=size.width+2&&r.width>=24&&r.height>=24),size.name+' larger text navigation remains onscreen and tappable');
    // Focus tool is reachable, starts, pauses and survives a reload without user data leaving the device.
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="focusTool"]').click();
    assert.equal(await page.locator('#atlas-focus-clock').textContent(),'25:00',size.name+' focus timer defaults to 25 minutes');
    await page.locator('[data-action="focus-toggle"]').click();
    assert.equal(await page.locator('#atlas-focus-status').textContent(),'Focus session running',size.name+' focus timer starts');
    await page.reload();
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="focusTool"]').click();
    assert.equal(await page.locator('#atlas-focus-status').textContent(),'Focus session running',size.name+' focus timer survives reload');
    await page.locator('[data-action="focus-toggle"]').click();
    assert.equal(await page.locator('#atlas-focus-status').textContent(),'Ready when you are',size.name+' focus timer pauses');
    await page.locator('[data-action="focus-reset"]').click();
    assert.equal(await page.locator('#atlas-focus-clock').textContent(),'25:00',size.name+' focus timer resets');
    await page.locator('#nav button[data-page="home"]').click();
    // Ten-tool page: verify calculator arithmetic and switch to text counting.
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="quickTools"]').click();
    assert.equal(await page.locator('#atlas-quick-select option').count(),12,size.name+' exposes twelve tools');
    await page.locator('#atlas-quick-a').fill('100');
    await page.locator('#atlas-quick-b').fill('20');
    assert.equal(await page.locator('#atlas-quick-result').textContent(),'£80.00 after discount',size.name+' discount calculation');
    await page.locator('#atlas-quick-select').selectOption('split');
    await page.locator('#atlas-quick-a').fill('30');
    await page.locator('#atlas-quick-b').fill('3');
    assert.equal(await page.locator('#atlas-quick-result').textContent(),'£10.00 each',size.name+' bill split');
    await page.locator('#atlas-quick-select').selectOption('words');
    await page.locator('#atlas-quick-text').fill('Hello world');
    assert.equal(await page.locator('#atlas-quick-result').textContent(),'2 words · 11 characters',size.name+' text counter');
    await page.locator('#atlas-quick-select').selectOption('subscriptions');
    await page.locator('#atlas-quick-a').fill('8.50');
    await page.locator('#atlas-quick-b').fill('4');
    assert.equal(await page.locator('#atlas-quick-result').textContent(),'£34.00 per month · £408.00 per year',size.name+' annual subscription audit');
    await page.locator('#atlas-quick-select').selectOption('runway');
    await page.locator('#atlas-quick-a').fill('900');
    await page.locator('#atlas-quick-b').fill('600');
    assert.equal(await page.locator('#atlas-quick-result').textContent(),'1.5 months covered · £900.00 to reach a 3-month fund',size.name+' emergency runway');
    await page.evaluate(() => document.activeElement?.blur());
    await page.evaluate(() => document.querySelector('#nav button[data-page="home"]').click());
    // Decision helper: enter two choices, pick one, then clear.
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="decisionTool"]').click();
    await page.locator('[data-decision-option="0"]').fill('Walk');
    await page.locator('[data-decision-option="1"]').fill('Read');
    await page.evaluate(() => document.activeElement?.blur());
    await page.locator('#nav button[data-page="home"]').click();
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="decisionTool"]').click();
    assert.deepEqual(await page.locator('[data-decision-option]').evaluateAll(nodes=>nodes.map(n=>n.value)),['',''],size.name+' decision options clear after navigation');
    await page.locator('[data-decision-option="0"]').fill('Walk');
    await page.locator('[data-decision-option="1"]').fill('Read');
    assert.deepEqual(await page.locator('[data-decision-option]').evaluateAll(nodes=>nodes.map(n=>n.value)),['Walk','Read'],size.name+' decision inputs retain values');
    await page.locator('[data-action="decision-pick"]').click();
    const decision=await page.locator('#content [role="status"] h2').first().textContent({timeout:5000}).catch(async()=>{throw new Error('Decision pick did not render: '+JSON.stringify(await page.locator('#content').innerText())+' | inputs '+JSON.stringify(await page.locator('[data-decision-option]').evaluateAll(nodes=>nodes.map(n=>n.value)))+' | errors '+JSON.stringify(errors));});
    assert.ok(['Walk','Read'].includes(decision),size.name+' decision picks a supplied option');
    // Editing invalidates the displayed choice immediately, without disrupting typing.
    const chosenIndex=decision==='Walk'?0:1;
    const editedOption=page.locator(`[data-decision-option="${chosenIndex}"]`);
    await editedOption.fill('Cook');
    assert.equal(await page.locator('#atlas-decision-result').count(),0,size.name+' stale decision disappears on edit');
    assert.equal(await editedOption.evaluate(el=>el===document.activeElement),true,size.name+' editing keeps input focus');
    await page.locator('[data-action="decision-pick"]').click();
    const updatedDecision=await page.locator('#atlas-decision-result h2').textContent();
    assert.ok(['Cook',decision==='Walk'?'Read':'Walk'].includes(updatedDecision),size.name+' next pick uses edited options');
    await page.locator('[data-decision-option="0"]').fill('');
    await page.locator('[data-decision-option="1"]').fill('');
    await page.locator('[data-action="decision-pick"]').click();
    assert.equal(await page.locator('#atlas-decision-result').count(),0,size.name+' invalid empty choices never show an old pick');
    await page.locator('[data-action="decision-clear"]').click();
    assert.equal(await page.locator('[data-decision-option="0"]').inputValue(),'',size.name+' decision scratchpad clears');
    await page.evaluate(() => document.activeElement?.blur());
    await page.evaluate(() => document.querySelector('#nav button[data-page="home"]').click());
    const graphics = await page.evaluate(() => {
      const hero = document.querySelector('.signature-hero h1 span');
      const tiles = [...document.querySelectorAll('.signature-links button')];
      const next = document.querySelector('.signature-next');
      return {
        headlineColor:getComputedStyle(hero).color,
        paragraphColor:getComputedStyle(document.querySelector('.signature-hero p')).color,
        tileCount:tiles.length,
        tiles:tiles.map(el=>({layout:getComputedStyle(el).display,width:el.clientWidth,scroll:el.scrollWidth})),
        panelBackground:getComputedStyle(next).backgroundImage,
        documentWidth:document.documentElement.scrollWidth,
        viewportWidth:document.documentElement.clientWidth
      };
    });
    assert.notEqual(graphics.headlineColor,graphics.paragraphColor,size.name+' personalized greeting is visually distinct');
    assert.equal(graphics.tileCount,3,size.name+' three workspace destinations');
    assert.ok(graphics.tiles.every(tile=>tile.layout==='grid'&&tile.scroll<=tile.width+2),size.name+' compact graphic tiles fit');
    assert.match(graphics.panelBackground,/gradient/i,size.name+' upcoming card has layered depth');
    assert.ok(graphics.documentWidth<=graphics.viewportWidth+2,size.name+' graphic home fits viewport');

    if (size.name === 'iphone') {
      for (const theme of ['arctic','forest','ember','midnight']) {
        await page.evaluate(nextTheme => {
          const key='atlas-preview:v1';
          const current=JSON.parse(localStorage.getItem(key)||'{"tasks":[]}');
          // Preserve the validated workspace schema; an empty object is deliberately rejected.
          localStorage.setItem(key,JSON.stringify({...current,tasks:current.tasks||[],theme:nextTheme}));
        },theme);
        await page.reload();
        await page.locator('.signature-links button').first().waitFor();
        const themeResult=await page.evaluate(()=>({
          theme:document.documentElement.dataset.atlasTheme,
          colorScheme:getComputedStyle(document.documentElement).colorScheme,
          headlineColor:getComputedStyle(document.querySelector('.signature-hero h1 span')).color,
          bodyColor:getComputedStyle(document.querySelector('.signature-hero h1')).color,
          width:document.documentElement.scrollWidth,
          viewport:document.documentElement.clientWidth
        }));
        assert.equal(themeResult.theme,theme,'theme '+theme+' persisted');
        assert.notEqual(themeResult.headlineColor,themeResult.bodyColor,'theme '+theme+' accent hierarchy');
        assert.equal(themeResult.colorScheme,theme==='arctic'?'light':'dark','theme '+theme+' system contrast');
        assert.ok(themeResult.width<=themeResult.viewport+2,'theme '+theme+' no horizontal overflow');
      }
    }
    const motion = await page.locator('#toast').evaluate(el=>({
      transition: getComputedStyle(el).transitionDuration,
      animation: getComputedStyle(el).animationDuration
    }));
    assert.ok(motion.transition.split(',').every(x=>parseFloat(x)<0.01),size.name+' reduced-motion transition '+motion.transition);
    if (size.name === 'desktop') {
      const surface = page.locator('.signature-links button').first();
      await surface.waitFor();
      const before = await surface.evaluate(el => getComputedStyle(el).borderTopColor);
      await surface.hover();
      const after = await surface.evaluate(el => getComputedStyle(el).borderTopColor);
      assert.notEqual(after, before, 'desktop cards must clearly indicate hover');
    }
    await page.locator('#nav button[data-page="calendar"]').click();
    assert.equal(await page.locator('#content').getAttribute('data-view'),'calendar',size.name+' calendar route');
    // Calendar graphic design: seven tappable, legible days and layered agenda on portrait screens.
    if (size.width < size.height) {
      const dateButtons=page.locator('.cal-portrait-date-strip .cal-portrait-date');
      assert.equal(await dateButtons.count(),7,size.name+' seven-day date rail');
      const portrait=await page.evaluate(()=>{
        const strip=document.querySelector('.cal-portrait-date-strip');
        const selected=document.querySelector('.cal-portrait-date.is-selected');
        const selectedStyle=getComputedStyle(selected);
        const stripStyle=getComputedStyle(strip);
        const outer=strip.getBoundingClientRect();
        return {
          grid:stripStyle.display,
          material:stripStyle.backgroundImage,
          selectedText:selectedStyle.color,
          selectedBorder:selectedStyle.borderTopColor,
          selectedBackground:selectedStyle.backgroundColor,
          selectedWidth:selected.getBoundingClientRect().width,
          selectedHeight:selected.getBoundingClientRect().height,
          stripLeft:outer.left,stripRight:outer.right,
          pressed:[...strip.querySelectorAll('[aria-pressed="true"]')].length
        };
      });
      assert.equal(portrait.grid,'grid',size.name+' seven-day grid');
      assert.match(portrait.material,/gradient/i,size.name+' calendar strip textured depth');
      assert.equal(portrait.pressed,1,size.name+' selected date accessible state');
      assert.ok(portrait.selectedHeight>=70,size.name+' large day touch area');
      assert.ok(portrait.selectedWidth>=28,size.name+' sufficient day touch width');
      assert.ok(portrait.stripLeft>=-2&&portrait.stripRight<=size.width+2,size.name+' date rail does not overflow');
      assert.notEqual(portrait.selectedBackground,'rgba(0, 0, 0, 0)',size.name+' selected date visibly highlighted');
    }
    if (size.width < size.height && mobile) {
      // Send trusted Chrome touch events, rather than merely invoking a handler.
      // A horizontal date-rail swipe changes the week; vertical panning and taps do not.
      const rail = page.locator('.cal-portrait-date-strip');
      await rail.scrollIntoViewIfNeeded();
      const box = await rail.boundingBox();
      assert.ok(box, size.name+' date rail visible');
      const client = await context.newCDPSession(page);
      async function swipe(fromX,fromY,toX,toY) {
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:fromX,y:fromY}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:fromX+(toX-fromX)*.5,y:fromY+(toY-fromY)*.5}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:toX,y:toY}]});
        await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      }
      const railX=box.x+box.width*.5,railY=box.y+box.height*.5;
      const firstDate=()=>rail.locator('.cal-portrait-date').first().getAttribute('data-date');
      assert.equal(await firstDate(),'2026-10-26',size.name+' initial week');
      await swipe(railX+38,railY,railX-62,railY+4);
      assert.equal(await firstDate(),'2026-11-02',size.name+' swipe left advances week');
      await swipe(railX-38,railY,railX+62,railY-4);
      assert.equal(await firstDate(),'2026-10-26',size.name+' swipe right returns week');
      await swipe(railX,railY,railX+5,railY+92);
      assert.equal(await firstDate(),'2026-10-26',size.name+' vertical scroll never switches week');
      await rail.locator('.cal-portrait-date[data-date="2026-10-30"]').click();
      assert.equal(await rail.locator('.cal-portrait-date[aria-pressed="true"]').getAttribute('data-date'),'2026-10-30',size.name+' ordinary date tap still works');
      await client.detach();
    }
    // Exercise the actual quick-add form with a fixed London date in every viewport.
    await page.locator('.calendar-tools > summary').click();
    await page.locator('#cal-quick-form input[name="quick"]').fill('ATLAS smoke next Monday at 3pm');
    await page.locator('#cal-quick-form button[type="submit"]').click();
    const quickEvent = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas-preview:v1')).calendarEvents.find(e => e.title === 'ATLAS smoke'));
    assert.ok(quickEvent, size.name+' quick-add event saved');
    assert.equal(quickEvent.startDate,'2026-11-02',size.name+' next Monday is in the next calendar week');
    assert.equal(quickEvent.startTime,'15:00',size.name+' quick-add time preserved');
    if (size.width < size.height) {
      // The real newly-added event must render as a readable, layered agenda card.
      // Quick-add re-renders Calendar and can close Tools automatically; do not toggle it open again.
      const calendarTools=page.locator('.calendar-tools');
      if (await calendarTools.evaluate(el=>el.open)) await calendarTools.locator('summary').click();
      await page.locator('.cal-period [data-action="cal-next"]').click();
      await page.locator('.cal-portrait-date[data-date="2026-11-02"]').click();
      const appointment=page.locator('.cal-portrait-appointment').filter({hasText:'ATLAS smoke'});
      assert.equal(await appointment.count(),1,size.name+' saved appointment visible in agenda');
      const card=await appointment.evaluate(el=>{
        const style=getComputedStyle(el),rect=el.getBoundingClientRect();
        return {
          title:el.querySelector('.cal-portrait-appointment-label strong')?.textContent,
          background:style.backgroundImage,
          leftBorder:style.borderLeftWidth,
          radius:style.borderTopLeftRadius,
          width:rect.width,
          viewport:document.documentElement.clientWidth,
          left:rect.left,right:rect.right
        };
      });
      assert.equal(card.title,'ATLAS smoke',size.name+' actual event text');
      assert.match(card.background,/gradient/i,size.name+' agenda card surface depth');
      assert.ok(parseFloat(card.leftBorder)>=3,size.name+' category indicator');
      assert.ok(parseFloat(card.radius)>=12,size.name+' rounded agenda cards');
      assert.ok(card.left>=-2&&card.right<=card.viewport+2,size.name+' agenda card fits viewport');
    }
    if (size.width > size.height && size.width >= 620) {
      // The real landscape time grid must retain seven accessible date columns.
      const grid = await page.evaluate(() => {
        const root=document.querySelector('.cal-landscape-week');
        const scroller=root.querySelector('.cal-week-scroller');
        const headers=[...root.querySelectorAll('.cal-grid-dayhead')];
        const today=root.querySelector('.cal-grid-dayhead.is-today');
        const other=headers.find(el=>el!==today);
        const todayStyle=getComputedStyle(today);
        const background=getComputedStyle(root.querySelector('.cal-grid-timeday'));
        return {
          display:getComputedStyle(root).display,
          dates:headers.length,
          namedDates:headers.every(el=>el.hasAttribute('aria-label')),
          scrollerBorder:getComputedStyle(scroller).borderTopWidth,
          scrollerRadius:getComputedStyle(scroller).borderTopLeftRadius,
          todayBackground:todayStyle.backgroundColor,
          ordinaryBackground:getComputedStyle(other).backgroundColor,
          todayMarker:todayStyle.boxShadow,
          hourGrid:background.backgroundImage,
          axis:root.querySelectorAll('.cal-axis-hour').length
        };
      });
      assert.notEqual(grid.display,'none',size.name+' seven-day desktop timetable visible');
      assert.equal(grid.dates,7,size.name+' seven clickable day headers');
      assert.ok(grid.namedDates,size.name+' dates retain accessible names');
      assert.equal(grid.axis,24,size.name+' 24 labelled hour positions');
      assert.ok(parseFloat(grid.scrollerBorder)>=1,size.name+' timetable panel boundary');
      assert.ok(parseFloat(grid.scrollerRadius)>=12,size.name+' rounded timetable frame');
      assert.notEqual(grid.todayBackground,grid.ordinaryBackground,size.name+' current day highlighted');
      assert.match(grid.todayMarker,/inset/i,size.name+' current-day underline');
      assert.match(grid.hourGrid,/gradient/i,size.name+' hourly grid texture');

      // After the quick-add has saved the event, navigate to the following week
      // and inspect the actual rendered time block, not a fabricated fixture.
      const toolsPanel=page.locator('.calendar-tools');
      if (await toolsPanel.evaluate(el=>el.open)) await toolsPanel.locator('summary').click();
      await page.locator('.cal-period [data-action="cal-next"]').click();
      const entry=page.locator('.cal-grid-event').filter({hasText:'ATLAS smoke'});
      assert.equal(await entry.count(),1,size.name+' saved event exists in time grid');
      const block=await entry.evaluate(el=>{
        const s=getComputedStyle(el),r=el.getBoundingClientRect();
        return {
          label:el.querySelector('strong')?.textContent,
          borderLeft:s.borderLeftWidth,
          radius:s.borderTopLeftRadius,
          fill:s.backgroundColor,
          shadow:s.boxShadow,
          width:r.width,
          height:r.height
        };
      });
      assert.equal(block.label,'ATLAS smoke',size.name+' event title preserved');
      assert.ok(parseFloat(block.borderLeft)>=3,size.name+' colored category edge');
      assert.ok(parseFloat(block.radius)>=8,size.name+' rounded event block');
      assert.ok(block.width>30&&block.height>=20,size.name+' event still has usable size');
      assert.notEqual(block.fill,'rgba(0, 0, 0, 0)',size.name+' event has opaque category surface');
    }
    if (mobile && size.width < size.height) {
      // The real Calendar event sheet must stay inside the visible viewport while focused.
      await page.locator('.calendar-actions button[data-action="cal-add"]').click();
      const dialog=page.locator('.modalback .sheet');
      await dialog.waitFor();
      await page.locator('.modalback #f-title').focus();
      await page.waitForFunction(()=>document.body.classList.contains('atlas-mobile-editing'));
      const editing=await dialog.evaluate(el=>{
        const r=el.getBoundingClientRect(),vv=visualViewport;
        return {
          top:r.top,bottom:r.bottom,visibleTop:vv?.offsetTop??0,
          visibleBottom:(vv?.offsetTop??0)+(vv?.height??innerHeight),
          maxHeight:getComputedStyle(el).maxHeight,
          nav:getComputedStyle(document.querySelector('#nav')).display,
          fab:getComputedStyle(document.querySelector('#fab')).display
        };
      });
      assert.ok(editing.top>=editing.visibleTop-2,size.name+' form top within visual viewport '+JSON.stringify(editing));
      assert.ok(editing.bottom<=editing.visibleBottom+2,size.name+' form bottom within visual viewport '+JSON.stringify(editing));
      assert.equal(editing.nav,'none',size.name+' no navigation overlapping event editor');
      assert.equal(editing.fab,'none',size.name+' no floating capture overlapping event editor');
      await page.locator('.modalback [data-action="modal-close"]').click();
      await page.waitForFunction(()=>!document.body.classList.contains('atlas-mobile-editing'));
      assert.notEqual(await page.locator('#nav').evaluate(el=>getComputedStyle(el).display),'none',size.name+' navigation back after editor closes');
    }
    const dimensions=await page.evaluate(()=>({
      scroll:document.documentElement.scrollWidth,
      viewport:document.documentElement.clientWidth
    }));
    if (dimensions.scroll > dimensions.viewport + 2) {
      const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')].map(el => {
        const r = el.getBoundingClientRect();
        return { tag:el.tagName, className:typeof el.className === 'string' ? el.className.slice(0,100) : '', id:el.id, left:Math.round(r.left), right:Math.round(r.right), width:Math.round(r.width) };
      }).filter(r => r.right > innerWidth + 2 || r.left < -2).sort((a,b) => b.right - a.right).slice(0,12));
      console.error('OVERFLOW OFFENDERS '+size.name+': '+JSON.stringify(offenders));
      const internals = await page.evaluate(() => [...document.querySelectorAll('html,body,body *')].map(el => ({el, delta:el.scrollWidth-el.clientWidth})).filter(item=>item.delta>3).sort((a,b)=>b.delta-a.delta).slice(0,14).map(({el,delta})=>({tag:el.tagName,id:el.id,className:typeof el.className==='string'?el.className.slice(0,100):'',clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,delta})));
      console.error('INTERNAL OVERFLOWS '+size.name+': '+JSON.stringify(internals));
      await page.addStyleTag({content:'*::before,*::after{content:none!important;display:none!important}'});
      console.error('WIDTH WITHOUT PSEUDOS '+size.name+': '+await page.evaluate(()=>document.documentElement.scrollWidth));

    }
    assert.ok(dimensions.scroll<=dimensions.viewport+2,size.name+' horizontal page overflow: '+JSON.stringify(dimensions));
    // Navigate every major workspace screen, not just the home and calendar.
    // This detects real-world narrow-screen overflow and broken navigation.
    await page.locator('#nav button[data-page="today"]').click();
    assert.equal(await page.locator('#content').getAttribute('data-view'),'today',size.name+' tasks route');

    // Today's real task workflow: no duplicates, urgent tasks shown, planning reversible.
    await page.evaluate(()=>{
      const key='atlas-preview:v1';
      const state=JSON.parse(localStorage.getItem(key));
      const mk=(id,props)=>({id,title:'ATLAS '+id,details:'',due:'',planned:'',focus:false,stage:'planned',priority:'normal',done:false,repeat:'none',subtasks:[],...props});
      state.tasks.push(
        mk('flow-focus-due',{due:'2026-10-28',planned:'2026-10-29',focus:true}),
        mk('flow-due',{due:'2026-10-29',planned:'2026-10-29'}),
        mk('flow-planned',{planned:'2026-10-29'}),
        mk('flow-inbox',{stage:'inbox'})
      );
      localStorage.setItem(key,JSON.stringify(state));
    });
    await page.reload();
    await page.locator('#nav button[data-page="today"]').click();
    const taskRows=page.locator('#content .task[data-task]');
    const taskIds=await taskRows.evaluateAll(rows=>rows.map(x=>x.dataset.task));
    assert.equal(new Set(taskIds).size,taskIds.length,size.name+' Today never repeats the same task');
    for(const id of ['flow-focus-due','flow-due','flow-planned','flow-inbox'])
      assert.equal(await page.locator('#content .task[data-task="'+id+'"]').count(),1,size.name+' '+id+' appears once');
    assert.match(await page.locator('.atlas-today-summary').innerText(),/2 due or overdue/,size.name+' urgency summary counts correctly');
    assert.match(await page.locator('#content').innerText(),/Your focus · 1\/3/,size.name+' focus count correct');
    await page.locator('.task[data-task="flow-planned"] [data-action="plan"]').click();
    assert.equal(await page.locator('.task[data-task="flow-planned"]').count(),0,size.name+' unplanning removes task from Today');
    await page.locator('.tabs button[data-view="all"]').click();
    const planAgain=page.locator('.task[data-task="flow-planned"] [data-action="plan"]');
    assert.equal(await planAgain.getAttribute('aria-label'),'Plan for today',size.name+' reversible control explains action');
    await planAgain.click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.find(t=>t.id==='flow-planned').planned),'2026-10-29',size.name+' task re-planned');
    await page.locator('.tabs button[data-view="today"]').click();
    assert.equal(await page.locator('.task[data-task="flow-planned"]').count(),1,size.name+' re-planned task reappears');
    await page.locator('.task[data-task="flow-due"] input.check').click();
    assert.equal(await page.locator('.task[data-task="flow-due"]').count(),0,size.name+' completed task leaves Today');
    assert.match(await page.locator('.atlas-today-summary').innerText(),/1 finished today/,size.name+' completion feedback reflects saved data');
    const taskWidth=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(taskWidth<=2,size.name+' Today task controls fit the screen');

    // Gesture interactions are tested against persisted workspace data.
    await page.locator('.tabs button[data-view="all"]').click();
    await page.locator('.task[data-task="flow-planned"] .atlas-task-more').click();
    assert.equal(await page.locator('.atlas-task-menu-sheet [role="button"]').count(),0,size.name+' task sheet uses genuine buttons');
    await page.locator('.atlas-task-menu-sheet [data-kind="tomorrow"]').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.find(t=>t.id==='flow-planned').planned),'2026-10-30',size.name+' action plans tomorrow without moving due date');
    assert.equal(await page.locator('#atlas-task-undo:visible').count(),1,size.name+' undo stays visible');
    await page.locator('#atlas-task-undo [data-action="task-undo"]').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.find(t=>t.id==='flow-planned').planned),'2026-10-29',size.name+' undo restores original planning');
    const simulateTaskPointer=async(id,dx,dy)=>{
      await page.evaluate(({id,dx,dy})=>{
        const body=document.querySelector('.task[data-task="'+id+'"] .taskbody');
        const r=body.getBoundingClientRect();
        const x=Math.max(55,Math.min(innerWidth-55,r.left+Math.min(60,r.width/2))),y=Math.max(90,Math.min(innerHeight-90,r.top+20));
        const make=(type,px,py)=>new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:77,pointerType:'touch',isPrimary:true,clientX:px,clientY:py});
        body.dispatchEvent(make('pointerdown',x,y));
        document.dispatchEvent(make('pointermove',x+dx,y+dy));
        document.dispatchEvent(make('pointerup',x+dx,y+dy));
      },{id,dx,dy});
    };
    await simulateTaskPointer('flow-planned',12,95);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.find(t=>t.id==='flow-planned').planned),'2026-10-29',size.name+' vertical scrolling gesture changes nothing');
    await simulateTaskPointer('flow-planned',-125,6);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.find(t=>t.id==='flow-planned').planned),'2026-10-30',size.name+' left swipe postpones planned date');
    await page.locator('#atlas-task-undo [data-action="task-undo"]').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.find(t=>t.id==='flow-planned').planned),'2026-10-29',size.name+' left swipe undo restored');
    await simulateTaskPointer('flow-focus-due',120,5);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.find(t=>t.id==='flow-focus-due').done),true,size.name+' right swipe completes');
    await page.locator('#atlas-task-undo [data-action="task-undo"]').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).tasks.find(t=>t.id==='flow-focus-due').done),false,size.name+' completion swipe undo');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),size.name+' gestures do not create overflow');
    await page.locator('.task[data-task="flow-planned"] .atlas-task-more').click();
    await page.locator('.atlas-task-menu-sheet [data-kind="edit"]').click();
    assert.equal(await page.locator('#modal-root #f-title').inputValue(),'ATLAS flow-planned',size.name+' keyboard/mouse edit fallback opens task');
    await page.locator('#modal-root [data-action="modal-close"]').click();



    // Timetable is a true weekly Calendar series: edit, persist, and remove on every viewport.
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="timetable"]').click();
    assert.equal(await page.locator('#content').getAttribute('data-view'),'timetable',size.name+' timetable route');
    assert.equal(await page.locator('.atlas-timetable-day').count(),7,size.name+' full week visible');
    await page.locator('button[data-action="timetable-add"]').first().click();
    await page.locator('#f-title').fill('Weekly class');
    await page.locator('#f-day').selectOption('2');
    await page.locator('#f-start').fill('17:00');
    await page.locator('#f-end').fill('18:30');
    await page.locator('#atlas-timetable-form button[type="submit"]').click();
    const block=page.locator('.atlas-timetable-block', {hasText:'Weekly class'});
    assert.equal(await block.count(),1,size.name+' weekly block created');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).calendarEvents.filter(e=>e.timetable===true));
    assert.equal(saved.length,1,size.name+' one timetable record');
    assert.equal(saved[0].repeat,'weekly',size.name+' timetable syncs with Calendar');
    await page.locator('button[data-action="timetable-mode"][data-mode="day"]').click();
    await page.locator('button[data-action="timetable-day"][data-day="2"]').click();
    assert.equal(await page.locator('.atlas-timetable-day').count(),1,size.name+' day switch works');
    assert.equal(await block.count(),1,size.name+' selected day shows saved block');
    await block.click();
    await page.locator('#f-title').fill('Updated class');
    await page.locator('#atlas-timetable-form button[type="submit"]').click();
    assert.equal(await page.locator('.atlas-timetable-block', {hasText:'Updated class'}).count(),1,size.name+' edited block');
    await page.reload();
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="timetable"]').click();
    assert.equal(await page.locator('.atlas-timetable-block', {hasText:'Updated class'}).count(),1,size.name+' timetable survives reload');

    if (size.name==='desktop') {
      await page.locator('button[data-action="timetable-mode"][data-mode="week"]').click();
      await page.locator('.atlas-timetable-block', {hasText:'Updated class'}).dragTo(page.locator('[data-timetable-drop-day="3"]'));
      assert.equal(await page.evaluate(()=>{
        const e=JSON.parse(localStorage.getItem('atlas-preview:v1')).calendarEvents.find(e=>e.timetable);
        return new Date(e.startDate+'T12:00:00').getDay();
      }),4,'desktop dragged weekly block to Thursday');
      await page.locator('#atlas-task-undo [data-action="timetable-undo"]').click();
      assert.equal(await page.evaluate(()=>{
        const e=JSON.parse(localStorage.getItem('atlas-preview:v1')).calendarEvents.find(e=>e.timetable);
        return new Date(e.startDate+'T12:00:00').getDay();
      }),3,'desktop timetable drag can undo');
    }

    await page.locator('button[data-action="goto-calendar"]').click();
    assert.equal(await page.locator('#content').getAttribute('data-view'),'calendar',size.name+' timetable opens Calendar');
    // Calendar date and weekly occurrence are verified via persisted records (the week view changes orientation).
    const occurs=await page.evaluate(()=>{
      const state=JSON.parse(localStorage.getItem('atlas-preview:v1'));
      return state.calendarEvents.filter(e=>e.timetable).map(e=>({repeat:e.repeat,title:e.title,start:e.startTime}));
    });
    assert.deepEqual(occurs,[{repeat:'weekly',title:'Updated class',start:'17:00'}],size.name+' Calendar contains timetable weekly series');

    if (mobile && size.width<size.height) {
      const touchSwipe=async(selector,dx)=>{
        return page.evaluate(({selector,dx})=>{
          const node=document.querySelector(selector),startX=190,startY=240,id=91;
          const touch=(x)=>new Touch({identifier:id,target:node,clientX:x,clientY:startY});
          node.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[touch(startX)],changedTouches:[touch(startX)]}));
          node.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[touch(startX+dx)]}));
        },{selector,dx});
      };
      const getSelected=()=>page.locator('.cal-portrait-date.is-selected').getAttribute('data-date');
      const initial=await getSelected();
      await touchSwipe('.cal-portrait-date-strip',-110);
      const weekAfter=await getSelected();
      assert.equal(Math.round((Date.parse(weekAfter+'T12:00:00')-Date.parse(initial+'T12:00:00'))/86400000),7,size.name+' rail swipe advances one week');
      await touchSwipe('.cal-portrait-day-head',-105);
      const dayAfter=await getSelected();
      assert.equal(Math.round((Date.parse(dayAfter+'T12:00:00')-Date.parse(weekAfter+'T12:00:00'))/86400000),1,size.name+' agenda swipe advances one day');
    }


    for (const destination of ['library','timetable','projects','notes','money','goals','insights','link','settings']) {
      await page.locator('#nav button[data-page="library"]').click();
      if (destination !== 'library') {
        await page.locator('#content button.signature-library-row[data-page="'+destination+'"]').click();
      }
      assert.equal(await page.locator('#content').getAttribute('data-view'),destination,size.name+' '+destination+' route');
      const layout = await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
      if(layout.scroll > layout.viewport + 2){
        const oversize = await page.evaluate(()=>[...document.querySelectorAll('html,body,body *')].filter(el=>el.scrollWidth>el.clientWidth+3).sort((a,b)=>(b.scrollWidth-b.clientWidth)-(a.scrollWidth-a.clientWidth)).slice(0,8).map(el=>({tag:el.tagName,cls:String(el.className).slice(0,80),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth})));
        console.error('OVERFLOW '+size.name+' '+destination+': '+JSON.stringify(oversize));
      }
      assert.ok(layout.scroll <= layout.viewport + 2,size.name+' '+destination+' page horizontal overflow: '+JSON.stringify(layout));
    }
    // Opt-in larger text must be readable, persistent and safe at every size.
    await page.locator('#atlas-text-size-select').selectOption('large');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).appearance.textSize),'large',size.name+' text size stored locally');
    await page.locator('#nav button[data-page="home"]').click();
    const largeHome=await page.evaluate(()=>({
      size:parseFloat(getComputedStyle(document.querySelector('.signature-hero p')).fontSize),
      width:document.documentElement.scrollWidth,
      viewport:document.documentElement.clientWidth
    }));
    assert.ok(largeHome.size>=16,size.name+' home copy enlarged');
    assert.ok(largeHome.width<=largeHome.viewport+2,size.name+' large text home fits');
    await page.locator('#nav button[data-page="calendar"]').click();
    const largeCalendar=await page.evaluate(()=>({
      width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth
    }));
    assert.ok(largeCalendar.width<=largeCalendar.viewport+2,size.name+' large text calendar fits');
    await page.reload();
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.atlasTextSize),'large',size.name+' text size survived reload');
    await page.locator('#nav button[data-page="library"]').click();
    const libraryType=await page.locator('.library-copy small').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    assert.ok(libraryType>=13,size.name+' library labels enlarged');
    await page.locator('#content button.signature-library-row[data-page="settings"]').click();
    assert.equal(await page.locator('#atlas-text-size-select').inputValue(),'large',size.name+' control reflects saved text size');

    // Graphite is a real locally saved theme, with an announced selected state.
    await page.locator('button.swatch[data-theme="graphite"]').click();
    assert.equal(await page.locator('button.swatch[data-theme="graphite"]').getAttribute('aria-pressed'),'true',size.name+' graphite selection announced');
    assert.equal(await page.locator('button.swatch[data-theme="midnight"]').getAttribute('aria-pressed'),'false',size.name+' previous theme not selected');
    const graphite=await page.evaluate(()=>({
      theme:document.documentElement.dataset.atlasTheme,
      surface:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
      saved:JSON.parse(localStorage.getItem('atlas-preview:v1')).theme,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    }));
    assert.deepEqual([graphite.theme,graphite.surface,graphite.saved],['graphite','#171a1f','graphite'],size.name+' graphite palette applied and saved');
    assert.ok(graphite.overflow<=2,size.name+' graphite theme has no horizontal overflow');
    await page.reload();
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.atlasTheme),'graphite',size.name+' graphite survives reload');
    await page.locator('#nav button[data-page="library"]').click();
    await page.locator('#content button.signature-library-row[data-page="settings"]').click();
    assert.equal(await page.locator('button.swatch[data-theme="graphite"]').getAttribute('aria-pressed'),'true',size.name+' restored theme selected');
    if (size.name !== 'iphone' && size.name !== 'desktop') {
      await page.locator('[data-action="appearance-reset"]').click();
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.atlasTextSize),'standard',size.name+' reset restores normal text');
    }
    if (size.name === 'iphone' || size.name === 'desktop') {
      // Real Appearance Studio controls must change the app, survive reload,
      // pass contrast checks, export through workspace storage and reset safely.
      await page.locator('#nav button[data-page="library"]').click();
      await page.locator('#content button.signature-library-row[data-page="settings"]').click();
      const picker=page.locator('#atlas-accent-input');
      await picker.waitFor();
      await picker.fill('#222222');
      await page.waitForFunction(()=>document.documentElement.dataset.atlasCustomAccent==='true');
      await page.locator('#atlas-density-select').selectOption('compact');
      await page.locator('#atlas-corners-select').selectOption('subtle');
      await page.locator('#atlas-texture-select').selectOption('off');
      await page.locator('#atlas-text-size-select').selectOption('large');
      await page.locator('#atlas-motion-select').selectOption('reduce');
      const appearance=await page.evaluate(()=>{
        const root=document.documentElement,style=getComputedStyle(root),stored=JSON.parse(localStorage.getItem('atlas-preview:v1'));
        const lumen=h=>('#'+h.replace('#','').toLowerCase()).match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
        const ratio=(a,b)=>{const x=lumen(a),y=lumen(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
        const customAccent=style.getPropertyValue('--accent-text').trim();
        const buttonAccent=style.getPropertyValue('--accent').trim();
        return {
          accent:stored.appearance?.accent,
          density:stored.appearance?.density,
          corners:stored.appearance?.corners,
          texture:stored.appearance?.texture,
          textSize:stored.appearance?.textSize,
          motion:stored.appearance?.motion,
          custom:root.dataset.atlasCustomAccent,
          accentRatio:ratio(customAccent,style.getPropertyValue('--surface').trim()),
          buttonRatio:ratio(buttonAccent,style.getPropertyValue('--accent-on').trim()),
          matte:style.getPropertyValue('--matte').trim(),
          libraryRadius:getComputedStyle(document.querySelector('.signature-library-row')||document.querySelector('.card')).borderTopLeftRadius,
          viewport:document.documentElement.clientWidth,
          scroll:document.documentElement.scrollWidth
        };
      });
      assert.deepEqual([appearance.accent,appearance.density,appearance.corners,appearance.texture,appearance.textSize,appearance.motion],['#222222','compact','subtle','off','large','reduce'],size.name+' appearance settings safely persisted');
      assert.equal(appearance.custom,'true',size.name+' custom accent active');
      assert.ok(appearance.accentRatio>=4.5,size.name+' contrast-safe accent text');
      assert.ok(appearance.buttonRatio>=4.5,size.name+' contrast-safe button');
      assert.equal(appearance.matte,'none',size.name+' grain disabled');
      assert.ok(appearance.scroll<=appearance.viewport+2,size.name+' appearance controls do not overflow');
      await page.reload();
      await page.locator('#nav button[data-page="library"]').click();
      await page.locator('#content button.signature-library-row[data-page="settings"]').click();
      assert.equal(await page.locator('#atlas-density-select').inputValue(),'compact',size.name+' compact layout survived reload');
      assert.equal(await page.locator('#atlas-motion-select').inputValue(),'reduce',size.name+' reduced motion survived reload');
      const motionProbe=()=>page.evaluate(()=>{const el=document.createElement('div');el.style.transition='opacity 1s';document.body.appendChild(el);const duration=parseFloat(getComputedStyle(el).transitionDuration);el.remove();return duration});
      await page.emulateMedia({reducedMotion:'no-preference'});
      assert.ok(await motionProbe()<0.001,size.name+' user reduced motion works without OS preference');
      await page.locator('#content button.swatch[data-theme="arctic"]').click();
      assert.equal(await page.locator('#atlas-accent-input').inputValue(),'#222222',size.name+' custom accent preserved across palettes');
      await page.locator('[data-action="appearance-reset"]').click();
      const reset=await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).appearance);
      assert.deepEqual(reset,{accent:'',density:'comfortable',corners:'rounded',texture:'subtle',textSize:'standard',fontStyle:'native',motion:'system'},size.name+' reset restores safe appearance defaults');
      assert.ok(await motionProbe()>=0.9,size.name+' reset restores device-controlled motion');
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.ok(await motionProbe()<0.001,size.name+' device reduced-motion preference always wins');
    }
    if (size.name === 'iphone' || size.name === 'desktop') {
      // Use the actual Journal form, local storage and graph, not sample records.
      await page.locator('#nav button[data-page="library"]').click();
      await page.locator('.signature-library-row[data-page="journal"]').click();
      assert.equal(await page.locator('#content').getAttribute('data-view'),'journal',size.name+' journal route');
      if (mobile && size.width < size.height) {
        // The Journal date control uses the operating system's picker, not a text keyboard.
        await page.locator('#atlas-journal-day').focus();
        assert.equal(await page.evaluate(()=>document.body.classList.contains('atlas-mobile-editing')),false,size.name+' native date picker does not activate keyboard layout');
        assert.notEqual(await page.locator('#nav').evaluate(el=>getComputedStyle(el).display),'none',size.name+' date picker keeps bottom navigation available');
        await page.locator('#atlas-journal-body').focus();
        await page.waitForFunction(()=>document.body.classList.contains('atlas-mobile-editing'));
        assert.equal(await page.locator('#nav').evaluate(el=>getComputedStyle(el).display),'none',size.name+' journal writing still clears navigation');
        await page.locator('#atlas-journal-body').evaluate(el=>el.blur());
        await page.waitForFunction(()=>!document.body.classList.contains('atlas-mobile-editing'));
        assert.notEqual(await page.locator('#nav').evaluate(el=>getComputedStyle(el).display),'none',size.name+' navigation restores after writing');
      }
      assert.equal(await page.locator('.atlas-journal-bar').count(),0,size.name+' no fabricated mood trend');
      // Switching dates must not silently destroy unsaved writing.
      await page.locator('#atlas-journal-body').fill('Draft that must not disappear.');
      page.once('dialog',dialog=>dialog.dismiss());
      await page.locator('#atlas-journal-day').fill('2026-10-28');
      assert.equal(await page.locator('#atlas-journal-day').inputValue(),'2026-10-29',size.name+' cancelled date change restores original date');
      assert.equal(await page.locator('#atlas-journal-body').inputValue(),'Draft that must not disappear.',size.name+' cancelled date change preserves writing');
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#atlas-journal-day').fill('2026-10-28');
      assert.equal(await page.locator('#atlas-journal-body').inputValue(),'',size.name+' confirmed date change loads blank day');
      await page.locator('#atlas-journal-day').fill('2026-10-29');
      assert.equal(await page.locator('[data-action="journal-export"]').isDisabled(),true,size.name+' empty journal cannot export');
      await page.locator('#atlas-journal-body').fill('A good day with family and some progress.');
      await page.locator('#atlas-journal-mood').selectOption('good');
      await page.locator('#atlas-journal-energy').selectOption('4');
      await page.locator('#atlas-journal-tags').fill('family, progress');
      await page.locator('#atlas-journal-form button[type="submit"]').click();
      const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).notes.filter(n=>n.journal===true));
      assert.equal(stored.length,1,size.name+' first journal entry saved');
      assert.equal(stored[0].journalDate,'2026-10-29',size.name+' dated London today');
      assert.deepEqual([stored[0].mood,stored[0].energy,stored[0].tags],['good',4,['family','progress']],size.name+' journal metadata saved');
      assert.equal(await page.locator('.atlas-journal-bar').count(),1,size.name+' trend uses one real entry');
      // Leaving the Journal also requires a deliberate decision when the form is dirty.
      await page.locator('#atlas-journal-body').fill('Unsaved replacement');
      await page.locator('#atlas-journal-body').evaluate(el=>el.blur());
      if (mobile && size.width < size.height) await page.waitForFunction(()=>!document.body.classList.contains('atlas-mobile-editing'));
      page.once('dialog',dialog=>dialog.dismiss());
      await page.locator('#nav button[data-page="home"]').click();
      assert.equal(await page.locator('#content').getAttribute('data-view'),'journal',size.name+' cancelled navigation stays in Journal');
      assert.equal(await page.locator('#atlas-journal-body').inputValue(),'Unsaved replacement',size.name+' cancelled navigation keeps edits');
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#nav button[data-page="home"]').click();
      assert.equal(await page.locator('#content').getAttribute('data-view'),'home',size.name+' confirmed navigation leaves Journal');
      assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('atlas-preview:v1')).notes.find(n=>n.journal===true).body)),'A good day with family and some progress.',size.name+' discarded edits never overwrite saved writing');
      await page.locator('#nav button[data-page="library"]').click();
      await page.locator('.signature-library-row[data-page="journal"]').click();
      await page.reload();
      await page.locator('#nav button[data-page="library"]').click();
      await page.locator('.signature-library-row[data-page="journal"]').click();
      assert.equal(await page.locator('#atlas-journal-body').inputValue(),'A good day with family and some progress.',size.name+' journal survives reload');
      await page.locator('#atlas-journal-day').fill('2026-10-28');
      assert.equal(await page.locator('#atlas-journal-body').inputValue(),'',size.name+' blank date starts a separate entry');
      await page.locator('#atlas-journal-body').fill('A hard day. Rest and reset.');
      await page.locator('#atlas-journal-mood').selectOption('rough');
      await page.locator('#atlas-journal-energy').selectOption('1');
      await page.locator('#atlas-journal-form button[type="submit"]').click();
      assert.equal(await page.locator('.atlas-journal-bar').count(),2,size.name+' chart contains both recorded days');
      // Export the actual saved entries and inspect the resulting local file.
      await page.evaluate(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
      const [journalDownload]=await Promise.all([page.waitForEvent('download'),page.locator('[data-action="journal-export"]').click()]);
      assert.match(journalDownload.suggestedFilename(),/^atlas-journal-\d{4}-\d{2}-\d{2}\.txt$/,size.name+' safe journal filename');
      const journalText=await readFile(await journalDownload.path(),'utf8');
      assert.match(journalText,/ATLAS PRIVATE JOURNAL\nSaved entries: 2/);
      assert.match(journalText,/Date: 2026-10-28[\s\S]*A hard day\. Rest and reset\.[\s\S]*Date: 2026-10-29[\s\S]*A good day with family and some progress\./,size.name+' chronological complete journal download');
      assert.match(journalText,/Mood: Rough[\s\S]*Energy: 1\/5[\s\S]*Mood: Good[\s\S]*Energy: 4\/5/,size.name+' journal metadata included');
      assert.doesNotMatch(journalText,/"balanceHistory"|"calendarEvents"|"bridgeSession"/,size.name+' journal export excludes unrelated workspace fields');
      const heights=await page.locator('.atlas-journal-bar span').evaluateAll(items=>items.map(el=>el.style.height));
      assert.deepEqual(heights,['20%','80%'],size.name+' mood graph faithfully renders rough and good scores');
      await page.locator('#atlas-journal-search').fill('family');
      assert.equal(await page.locator('.atlas-journal-history-row:visible').count(),1,size.name+' journal tag search filters history');
      // Explicitly dismiss the mobile search keyboard before selecting history.
      await page.locator('#atlas-journal-search').evaluate(el=>el.blur());
      await page.locator('.atlas-journal-history-row:visible').click();
      assert.equal(await page.locator('#atlas-journal-day').inputValue(),'2026-10-29',size.name+' history selects day');
      await page.locator('[data-action="journal-calendar"]').click();
      assert.equal(await page.locator('#content').getAttribute('data-view'),'calendar',size.name+' journal links to Calendar');
      assert.equal(await page.locator('#cal-jump-date').inputValue(),'2026-10-29',size.name+' calendar opens journal day');
    }
    await page.locator('.top-actions button[data-action="search"]').click();
    assert.equal(await page.locator('#content').getAttribute('data-view'),'search',size.name+' search route');
    const searchLayout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
    assert.ok(searchLayout.scroll<=searchLayout.viewport+2,size.name+' search page overflow: '+JSON.stringify(searchLayout));
    // The desktop shortcut also works for an external iPad/phone keyboard.
    // Use the app route action rather than clicking navigation hidden during keyboard focus.
    await page.keyboard.press('Escape');
    await page.locator('#nav button[data-page="home"]').click();
    await page.keyboard.press('Control+k');
    assert.equal(await page.locator('#content').getAttribute('data-view'),'search',size.name+' Ctrl+K navigation');
    assert.equal(await page.locator('#search-input').evaluate(el=>document.activeElement===el),true,size.name+' search receives focus');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#content').getAttribute('data-view'),'home',size.name+' Esc closes search');
    await page.keyboard.press('Meta+k');
    assert.equal(await page.locator('#content').getAttribute('data-view'),'search',size.name+' Cmd+K navigation');
    await page.keyboard.press('Escape');
    assert.deepEqual(errors,[],size.name+' browser JavaScript errors');
    console.log('PASS '+size.name+' '+size.width+'x'+size.height+' 12 screens/reduced-motion/no-overflow/no-JS-errors');
    await context.close();
  }
} finally { await browser.close(); }
