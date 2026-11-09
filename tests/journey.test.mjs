import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const normalizer=html.slice(html.indexOf('const GAME_MATERIALS='),html.indexOf('const defaults='));
const game=html.slice(html.indexOf('/* Journey derives'),html.indexOf('function home(){'));

function harness(){
 const data={game:{enabled:true,awards:[],claims:[],rewards:[]}};
 const helpers=new Function('data','showToast',normalizer+'\n'+game+'\nreturn {gameAward,gameTotals,gameNormalize};')(data,()=>{});
 return {data,...helpers};
}

test('Journey awards a source only once, including after reopening and re-checking',()=>{
 const {data,gameAward,gameTotals}=harness();
 assert.equal(gameAward('task','task:abc'),true);
 assert.equal(gameAward('task','task:abc'),false);
 assert.equal(gameAward('habit','habit:def:2026-11-08'),true);
 assert.equal(gameAward('habit','habit:def:2026-11-08'),false);
 assert.deepEqual(gameTotals(),{xp:30,earned:8,spent:0,coins:8,level:1,levelXP:30,levelNeeded:75});
 assert.equal(data.game.awards.length,2);
});

test('Five unique actions trigger the one-time first steps bonus and levels progress',()=>{
 const {data,gameAward,gameTotals}=harness();
 for(let i=0;i<5;i++)assert.equal(gameAward('task','task:'+i),true);
 assert.equal(data.game.awards.length,6);
 assert.equal(data.game.awards.filter(a=>a.kind==='milestone').length,1);
 assert.equal(gameTotals().xp,150);
 assert.equal(gameTotals().coins,55);
 assert.equal(gameTotals().level,2);
 assert.equal(gameAward('task','task:4'),false);
 data.game.claims.push({id:'c1',title:'A break',cost:20,at:Date.now()});
 assert.equal(gameTotals().coins,35);
 data.game.enabled=false;
 assert.equal(gameAward('task','task:later'),false);
});

test('Normalising Journey history retains valid entries and filters malformed or repeated rewards',()=>{
 const {gameNormalize}=harness();
 const state=gameNormalize({enabled:false,awards:[{key:'task:1',kind:'task',xp:20,coins:5,at:1},{key:'task:1',kind:'task',xp:20,coins:5,at:2},{key:'task:2',kind:'task',xp:-5,coins:10,at:3}],rewards:[{id:'r',title:'Tea',cost:10},{id:'r',title:'Tea',cost:10},{id:'bad',title:'Broken',cost:-1}],claims:[{id:'a',title:'Tea',cost:10,at:4}]});
 assert.equal(state.enabled,false);
 assert.equal(state.awards.length,1);
 assert.equal(state.rewards.length,1);
 assert.equal(state.claims.length,1);
});

test('Journey hooks into shared tasks, habits and navigation',()=>{
 // Import safety is exercised against the validator in forge.test.mjs.
 assert.match(html,/const views=\{home,today,calendar[^}]*gameScreen/);
 assert.match(html,/gameAward\('habit','habit:'\+habit\.id\+':'\+today\)/);
 assert.match(html,/gameAward\('task','task:'\+t\.id,gameTaskReward\(t\)\)/);
 assert.match(html,/\['gameScreen','✦','Journey'\]/);
});
