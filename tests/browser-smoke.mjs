// Browser-only smoke suite. Runs in GitHub Actions, not in the app bundle.
// Playwright is installed in CI and is never a production dependency.
import assert from 'node:assert/strict';
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
      assert.notEqual(await nav.evaluate(el=>getComputedStyle(el).display),'none',size.name+' navigation back after editor closes');
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
    for (const destination of ['library','projects','notes','money','goals','insights','link','settings']) {
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
    await page.locator('.top-actions button[data-action="search"]').click();
    assert.equal(await page.locator('#content').getAttribute('data-view'),'search',size.name+' search route');
    const searchLayout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
    assert.ok(searchLayout.scroll<=searchLayout.viewport+2,size.name+' search page overflow: '+JSON.stringify(searchLayout));
    // The desktop shortcut also works for an external iPad/phone keyboard.
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
