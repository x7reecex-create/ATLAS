import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const style=html.slice(html.indexOf('<style>'),html.indexOf('</style>'));

test('Wayfinder is a distinct, palette-aware CSS-only brand motif',()=>{
 assert.match(style,/ATLAS WAYFINDER 2026/);
 for(const token of ['--atlas-wayline','--atlas-waypoint','--atlas-waywash']){
  assert.ok(style.includes(token+':color-mix(in srgb,var('),token+' respects selected theme');
 }
 assert.match(style,/\.signature-home \.signature-hero:before\s*\{/);
 assert.match(style,/\.signature-home \.signature-next:after\s*\{/);
 assert.match(style,/\.signature-home \.signature-links button:before\s*\{/);
 assert.ok(!style.slice(style.indexOf('ATLAS WAYFINDER 2026')).includes('@import'));
});

test('wayfinding decoration cannot intercept interactions or crowd narrow screens',()=>{
 const wayfinder=style.slice(style.indexOf('ATLAS WAYFINDER 2026'));
 assert.match(wayfinder,/pointer-events:none/);
 assert.match(wayfinder,/@media\(max-width:540px\)/);
 assert.match(wayfinder,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/aria-label="Main navigation"/);
 assert.match(html,/data-action="search"/);
});

test('new visual shell is versioned without introducing user-data caching',()=>{
 assert.match(sw,/atlas-private-ios-v33-public-shell/);
 assert.match(sw,/function privateRequest\(request\)/);
 assert.match(sw,/credentials: 'omit'/);
 assert.match(sw,/if \(url\.href !== SCOPE\.href && url\.href !== SHELL\) return;/);
});
