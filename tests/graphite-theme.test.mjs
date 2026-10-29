import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const match=html.match(/const palettes=\{([^;]+)\};/);
assert.ok(match,'theme palette definition must exist');
const palettes=new Function('return ({'+match[1]+'});')();

function luminance(hex){
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
    .map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4)
    .reduce((total,n,i)=>total+n*[0.2126,0.7152,0.0722][i],0);
}
function contrast(a,b){
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}

test('graphite provides a complete premium neutral theme with readable colours',()=>{
  const graphite=palettes.graphite;
  assert.ok(Array.isArray(graphite));
  assert.equal(graphite.length,10);
  for(const value of graphite)assert.match(value,/^#[0-9a-f]{6}$/i);
  assert.ok(contrast(graphite[4],graphite[1])>=7,'body text on surface is AAA');
  assert.ok(contrast(graphite[5],graphite[1])>=4.5,'muted copy on surface is AA');
  assert.ok(contrast(graphite[6],graphite[1])>=4.5,'accent copy on surface is AA');
  assert.ok(contrast(graphite[0],graphite[6])>=4.5,'text on accent button is AA');
});

test('theme selection announces its state and uses existing local persistence',()=>{
  assert.match(html,/data-action="theme" data-theme="\$\{k\}" aria-pressed="\$\{data\.theme===k\}"/);
  assert.match(html,/d\.theme=palettes\[d\.theme\]\?d\.theme:'midnight'/,'saved graphite accepted by existing normaliser');
  assert.match(html,/theme:'midnight'/,'existing user default preserved');
  assert.match(html,/if\(a==='theme'\)\{data\.theme=element\.dataset\.theme;return commit\('Theme changed'\)\}/);
});

test('offline app shell refreshes without changing private storage',()=>{
  const version=sw.match(/const CACHE = 'atlas-private-ios-v(\d+)-public-shell';/);
  assert.ok(version,'versioned public offline cache exists');
  assert.ok(Number(version[1])>=26,'updated shell invalidates earlier cached HTML');
  assert.match(html,/const KEY='atlas-preview:v1'/);
});
