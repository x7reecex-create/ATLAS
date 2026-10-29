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
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8765/index.html', {waitUntil:'load'});
    await page.locator('#nav button[data-page="home"]').waitFor({timeout:12000});
    assert.equal(await page.locator('#content').getAttribute('data-view'),'home',size.name+' home route');
    const motion = await page.locator('#toast').evaluate(el=>({
      transition: getComputedStyle(el).transitionDuration,
      animation: getComputedStyle(el).animationDuration
    }));
    assert.ok(motion.transition.split(',').every(x=>parseFloat(x)<0.01),size.name+' reduced-motion transition '+motion.transition);
    await page.locator('#nav button[data-page="calendar"]').click();
    assert.equal(await page.locator('#content').getAttribute('data-view'),'calendar',size.name+' calendar route');
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
    }
    assert.ok(dimensions.scroll<=dimensions.viewport+2,size.name+' horizontal page overflow: '+JSON.stringify(dimensions));
    assert.deepEqual(errors,[],size.name+' browser JavaScript errors');
    console.log('PASS '+size.name+' '+size.width+'x'+size.height+' home/calendar/reduced-motion/no-overflow/no-JS-errors');
    await context.close();
  }
} finally { await browser.close(); }
