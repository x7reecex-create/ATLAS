import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const normalizer=html.slice(html.indexOf('const GAME_MATERIALS='),html.indexOf('const defaults='));
const game=html.slice(html.indexOf('/* Journey derives'),html.indexOf('function home(){'));

function harness(){
 const data={game:{enabled:true,awards:[],claims:[],rewards:[],crafted:[],explored:[]},tasks:[],habits:[],habitLogs:[],displayName:''};
 let next=0,failSave=false,saved='';
 const messages=[];
 const api=new Function('data','showToast','id','esc','calLondonToday','calStartWeek','commit','render',normalizer+'\n'+game+`
  return {gameAward,gameNormalize,gameWorldAdjacent,gameTravelCredits,gameExplore,gameMaterials,gameCraft,gameScreen,gameAction,setTab(tab){gameTab=tab}};
 `)(data,message=>messages.push(message),()=>`item-${++next}`,s=>String(s),()=>'2026-11-08',()=>'2026-11-02',message=>{
  if(failSave){failSave=false;return false;}
  saved=JSON.stringify(data.game);messages.push(message);return true;
 },()=>{});
 return {data,messages,...api,failNextSave(){failSave=true},getSaved(){return saved}};
}

function earn(h,n){for(let i=0;i<n;i++)assert.equal(h.gameAward('task',`task:${i}`),true)}

test('no free repeatable exploration; one distinct real action unlocks one frontier tile',()=>{
 const h=harness();
 assert.equal(h.gameTravelCredits(),0);
 assert.equal(h.gameExplore('1'),false);
 assert.equal(h.gameExplore('5'),false);
 earn(h,1);
 assert.equal(h.gameTravelCredits(),1);
 assert.equal(h.gameExplore('5'),false,'diagonal jumping must not be allowed');
 assert.equal(h.gameExplore('1'),true);
 assert.equal(h.gameTravelCredits(),0);
 assert.equal(h.gameExplore('1'),false,'repeated discoveries give no loot');
 assert.equal(h.gameExplore('4'),false);
 assert.deepEqual(h.data.game.explored,['1']);
});

test('revealing a location grants its fixed one-time loot, without replacing task rewards',()=>{
 const h=harness();earn(h,2);
 assert.deepEqual(h.gameMaterials(),{timber:4,iron:2,fibre:0,essence:0});
 assert.equal(h.gameExplore('1'),true);
 assert.deepEqual(h.gameMaterials(),{timber:6,iron:2,fibre:0,essence:0});
 assert.equal(h.gameExplore('2'),true);
 assert.deepEqual(h.gameMaterials(),{timber:6,iron:4,fibre:0,essence:0});
 assert.equal(h.gameExplore('2'),false);
 assert.equal(h.gameCraft('stool'),true);
 assert.deepEqual(h.gameMaterials(),{timber:4,iron:3,fibre:0,essence:0});
});

test('exploration follows a contiguous route and unlocks landmark blueprints',()=>{
 const h=harness();earn(h,6);
 assert.equal(h.gameCraft('anvil'),false);
 assert.equal(h.gameCraft('relic'),false);
 assert.equal(h.gameCraft('telescope'),false);
 for(const id of ['1','2','6','10','11','15'])assert.equal(h.gameExplore(id),true);
 assert.equal(h.gameTravelCredits(),0);
 assert.equal(h.gameCraft('anvil'),true);
 assert.equal(h.gameCraft('relic'),true);
 assert.equal(h.gameCraft('telescope'),true);
 assert.equal(h.data.game.crafted.length,3);
 const restored=h.gameNormalize(h.data.game);
 assert.deepEqual(restored.explored,h.data.game.explored);
 assert.equal(restored.crafted.length,3);
});

test('normalisation rejects disconnected, duplicate and unearned discoveries',()=>{
 const h=harness();earn(h,2);
 const valid=h.gameNormalize({...h.data.game,explored:['1','2']});
 assert.deepEqual(valid.explored,['1','2']);
 const invalid=h.gameNormalize({...h.data.game,explored:['15','1','1','6','2','3']});
 assert.deepEqual(invalid.explored,['1','2']);
 assert.deepEqual(h.gameNormalize({}).explored,[],'old saves remain valid');
});

test('imported furniture cannot claim a landmark-locked recipe without discovery',()=>{
 const h=harness();earn(h,4);
 const invalid=h.gameNormalize({...h.data.game,crafted:[{id:'fake',recipeId:'anvil',at:1,slot:'1'}]});
 assert.equal(invalid.crafted.length,0);
 assert.equal(invalid.explored.length,0);
});

test('failed saving an exploration rolls back the path and material rewards',()=>{
 const h=harness();earn(h,1);
 const stock=h.gameMaterials(),before=JSON.stringify(h.data.game);
 h.failNextSave();h.gameAction({dataset:{action:'game-explore',id:'1'}});
 assert.equal(JSON.stringify(h.data.game),before);
 assert.deepEqual(h.gameMaterials(),stock);
 assert.equal(h.gameTravelCredits(),1);
 assert.equal(h.getSaved(),'');
 h.gameAction({dataset:{action:'game-explore',id:'1'}});
 assert.deepEqual(JSON.parse(h.getSaved()).explored,['1']);
 assert.equal(h.gameTravelCredits(),0);
});

test('paused FORGE cannot explore and the world map has accessible destinations',()=>{
 const h=harness();earn(h,1);
 h.setTab('world');
 const view=h.gameScreen();
 assert.match(view,/data-tab="world"/);
 assert.equal((view.match(/data-action="game-explore"/g)||[]).length,16);
 assert.match(view,/aria-label="Mossy Trail, explore with one trail token"/);
 assert.match(view,/THE VALLEY/);
 assert.match(view,/Trail tokens ready/);
 h.data.game.enabled=false;
 assert.equal(h.gameExplore('1'),false);
});
