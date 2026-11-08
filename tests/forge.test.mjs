import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const normalizer=html.slice(html.indexOf('const GAME_MATERIALS='),html.indexOf('const defaults='));
const game=html.slice(html.indexOf('/* Journey derives'),html.indexOf('function home(){'));

function harness(gameState={enabled:true,awards:[],claims:[],rewards:[],crafted:[]}){
 const data={game:gameState};let next=0;
 const messages=[];let failNextCommit=false,renderCount=0,savedGame=null;
 const api=new Function('data','showToast','id','esc','calLondonToday','calStartWeek','commit','render',normalizer+'\n'+game+`\nreturn {
  gameAward,gameNormalize,gameMaterials:typeof gameMaterials==='function'?gameMaterials:null,
  gameCraft:typeof gameCraft==='function'?gameCraft:null,
  gamePlace:typeof gamePlace==='function'?gamePlace:null,
  gameUnplace:typeof gameUnplace==='function'?gameUnplace:null,
  gameWorldRoute,gameWorldTravel,gameWorldScreen,gameScreen,gameAction,
  setTab(tab){gameTab=tab},setForgeView(view){gameForgeView=view}
 };`)(data,()=>{},()=>`item-${++next}`,v=>String(v),()=>'2026-11-08',()=> '2026-11-02',v=>{
  if(failNextCommit){failNextCommit=false;return false;}
  savedGame=JSON.stringify(data.game);messages.push(v);renderCount++;return true;
 },()=>{renderCount++;});
 return {data,messages,...api,failNextSave(){failNextCommit=true},getSavedGame(){return savedGame},getRenderCount(){return renderCount}};
}

test('one real task earns materials once, then crafts and places a stool',()=>{
 const {data,gameAward,gameMaterials,gameCraft,gamePlace,gameUnplace}=harness();
 assert.equal(typeof gameMaterials,'function');
 assert.equal(gameAward('task','task:tidy-room'),true);
 assert.equal(gameAward('task','task:tidy-room'),false);
 assert.deepEqual(gameMaterials(),{timber:2,iron:1,fibre:0,essence:0});
 assert.equal(gameCraft('stool'),true);
 assert.equal(data.game.crafted.length,1);
 assert.deepEqual(gameMaterials(),{timber:0,iron:0,fibre:0,essence:0});
 assert.equal(gameCraft('stool'),false);
 const item=data.game.crafted[0];
 assert.equal(item.recipeId,'stool');
 assert.equal(item.slot,'');
 assert.equal(gamePlace(item.id,'4'),true);
 assert.equal(item.slot,'4');
 assert.equal(gameUnplace(item.id),true);
 assert.equal(item.slot,'');
});

test('different actions supply different materials, making a habit-grown plant craftable',()=>{
 const {data,gameAward,gameMaterials,gameCraft}=harness();
 assert.equal(gameAward('habit','habit:water:2026-11-08'),true);
 assert.deepEqual(gameMaterials(),{timber:0,iron:0,fibre:2,essence:1});
 assert.equal(gameCraft('plant'),true);
 assert.equal(data.game.crafted[0].recipeId,'plant');
 assert.equal(gameMaterials().essence,0);
 assert.equal(gameAward('habit','habit:water:2026-11-08'),false);
 assert.equal(gameCraft('plant'),false);
});

test('unknown, unaffordable and paused crafting cannot change inventory',()=>{
 const {data,gameCraft,gamePlace,gameAward,gameMaterials}=harness();
 assert.equal(gameCraft('missing'),false);
 assert.equal(gameCraft('shelf'),false);
 assert.equal(data.game.crafted.length,0);
 gameAward('task','task:one');
 data.game.enabled=false;
 assert.equal(gameCraft('stool'),false);
 assert.equal(gamePlace('missing','1'),false);
 assert.equal(data.game.crafted.length,0);
 assert.equal(gameMaterials().timber,2);
});

test('a room cannot silently overwrite another placed item or accept invalid slots',()=>{
 const {data,gameAward,gameCraft,gamePlace,gameUnplace}=harness();
 gameAward('task','task:a');gameAward('task','task:b');
 assert.equal(gameCraft('stool'),true);assert.equal(gameCraft('stool'),true);
 const [first,second]=data.game.crafted;
 assert.equal(gamePlace(first.id,'1'),true);
 assert.equal(gamePlace(second.id,'1'),false);
 assert.equal(gamePlace(second.id,'99'),false);
 assert.equal(gamePlace(second.id,'2'),true);
 assert.equal(gamePlace(first.id,'3'),true);
 assert.equal(first.slot,'3');
 assert.equal(second.slot,'2');
 assert.equal(gameUnplace(first.id),true);
 assert.equal(gameUnplace(first.id),false);
});

test('old Journey data normalises to an empty workshop and crafted records survive backup restoration',()=>{
 const {gameNormalize}=harness();
 const old=gameNormalize({enabled:true,awards:[{key:'task:old',kind:'task',xp:20,coins:5,at:1}],claims:[],rewards:[]});
 assert.deepEqual(old.crafted,[]);
 assert.equal(old.awards.length,1);
 const now=gameNormalize({...old,crafted:[{id:'f1',recipeId:'stool',at:42,slot:'8'}]});
 assert.deepEqual(now.crafted,[{id:'f1',recipeId:'stool',at:42,slot:'8'}]);
 const corrupted=gameNormalize({...old,crafted:[
  {id:'f1',recipeId:'stool',at:42,slot:'8'},
  {id:'f1',recipeId:'stool',at:43,slot:'9'},
  {id:'f2',recipeId:'stool',at:44,slot:'8'},
  {id:'f3',recipeId:'unknown',at:45,slot:'1'}
 ]});
 assert.equal(corrupted.crafted.length,1);
});

test('Workshop exposes a visible materials list, usable recipes, inventory and nine room spaces',()=>{
 const {gameScreen,setTab,setForgeView}=harness();setTab('forge');setForgeView('workshop');
 const view=gameScreen();
 assert.match(view,/Workshop/);
 assert.match(view,/Foundry stool/);
 assert.match(view,/data-action="game-craft" data-id="stool"/);
 assert.equal((view.match(/data-action="game-slot"/g)||[]).length,9);
 assert.match(view,/TIMBER/);
 assert.match(view,/0 available/);
});

test('Workshop buttons craft, choose an item, place it in a chosen room space and pick it up',()=>{
 const {data,gameAward,gameAction,setTab,setForgeView,gameScreen}=harness();setTab('forge');setForgeView('workshop');
 gameAward('task','task:one');
 gameAction({dataset:{action:'game-craft',id:'stool'}});
 assert.equal(data.game.crafted.length,1);
 const piece=data.game.crafted[0];
 assert.match(gameScreen(),/data-action="game-select"/);
 gameAction({dataset:{action:'game-select',id:piece.id}});
 gameAction({dataset:{action:'game-slot',slot:'7'}});
 assert.equal(piece.slot,'7');
 assert.match(gameScreen(),/data-action="game-slot" data-slot="7"/);
 gameAction({dataset:{action:'game-slot',slot:'7'}});
 assert.equal(piece.slot,'');
});

test('failed craft save rolls back materials and selection; retry spends once',()=>{
 const h=harness();h.gameAward('task','task:a');h.gameAward('task','task:b');
 const before=JSON.stringify(h.data.game),materials=h.gameMaterials();
 h.failNextSave();h.gameAction({dataset:{action:'game-craft',id:'stool'}});
 assert.equal(JSON.stringify(h.data.game),before,'failed persistence must leave no crafted item');
 assert.deepEqual(h.gameMaterials(),materials,'failed persistence cannot consume materials');
 assert.equal(h.getSavedGame(),null);
 h.gameAction({dataset:{action:'game-craft',id:'stool'}});
 assert.equal(h.data.game.crafted.length,1);
 assert.deepEqual(h.gameMaterials(),{timber:2,iron:1,fibre:0,essence:0});
 assert.equal(JSON.parse(h.getSavedGame()).crafted.length,1);
});

test('failed place and pickup saves restore room slots and permit exactly one retry',()=>{
 const h=harness();h.gameAward('task','task:a');
 h.gameAction({dataset:{action:'game-craft',id:'stool'}});
 const item=h.data.game.crafted[0];
 h.failNextSave();h.gameAction({dataset:{action:'game-slot',slot:'3'}});
 assert.equal(h.data.game.crafted[0].slot,'');
 assert.equal(JSON.parse(h.getSavedGame()).crafted[0].slot,'');
 h.gameAction({dataset:{action:'game-slot',slot:'3'}});
 assert.equal(h.data.game.crafted[0].slot,'3');
 assert.equal(JSON.parse(h.getSavedGame()).crafted[0].slot,'3');
 h.failNextSave();h.gameAction({dataset:{action:'game-slot',slot:'3'}});
 assert.equal(h.data.game.crafted[0].slot,'3');
 assert.equal(JSON.parse(h.getSavedGame()).crafted[0].slot,'3');
 h.gameAction({dataset:{action:'game-slot',slot:'3'}});
 assert.equal(h.data.game.crafted[0].slot,'');
 assert.equal(JSON.parse(h.getSavedGame()).crafted[0].slot,'');
 assert.equal(h.data.game.crafted.length,1);
 assert.equal(item.id,h.data.game.crafted[0].id);
});

test('Forge opens a walkable village with real landmarks and a workshop entrance',()=>{
 const h=harness();h.setTab('forge');h.setForgeView('world');
 const markup=h.gameScreen();
 assert.match(markup,/Hearthvale/);
 assert.match(markup,/data-action="game-world-travel"/);
 assert.match(markup,/data-action="game-world-step"/);
 assert.match(markup,/5 places found/);
 assert.equal((markup.match(/data-action="game-world-travel"/g)||[]).length,81);
 h.gameAction({dataset:{action:'game-world-travel',x:'4',y:'4'}});
 assert.deepEqual(h.data.game.world,{x:4,y:4,visited:['F']});
 assert.match(h.gameWorldScreen(),/Enter workshop/);
 h.gameAction({dataset:{action:'game-forge-view',view:'workshop'}});
 assert.match(h.gameScreen(),/Foundry stool/);
});

test('village routes stay on walkable tiles and reject blocked or invalid travel',()=>{
 const h=harness();
 assert.deepEqual(h.gameWorldRoute(4,5,4,4),[[4,5],[4,4]]);
 assert.deepEqual(h.gameWorldRoute(4,5,0,0),[]);
 assert.deepEqual(h.gameWorldRoute(4,5,1,7).at(-1),[1,7]);
 assert.equal(h.gameWorldTravel(0,0),false);
 assert.equal(h.gameWorldTravel(-1,4),false);
 assert.equal(h.data.game.world,undefined);
 assert.equal(h.gameWorldTravel(1,7),true);
 assert.equal(h.data.game.world.visited.includes('Q'),true);
 assert.equal(h.gameWorldTravel(1,7),false,'revisiting the same tile must not create a save');
});

test('village discovery is backed up and imported safely without double grants',()=>{
 const h=harness();h.gameAward('task','task:existing');
 h.gameWorldTravel(4,1);h.gameWorldTravel(7,7);
 const restored=h.gameNormalize(JSON.parse(JSON.stringify(h.data.game)));
 assert.deepEqual(restored.world,h.data.game.world);
 assert.equal(restored.awards.length,1,'walking should never grant XP');
 const tampered=h.gameNormalize({...restored,world:{x:0,y:0,visited:['F','F','Z','Q']}});
 assert.deepEqual(tampered.world,{x:4,y:5,visited:['F','Q']});
});

test('failed village save rolls back the position and discovery; retry persists once',()=>{
 const h=harness();
 h.failNextSave();h.gameAction({dataset:{action:'game-world-travel',x:'4',y:'4'}});
 assert.equal(h.data.game.world,undefined);
 assert.equal(h.getSavedGame(),null);
 h.gameAction({dataset:{action:'game-world-travel',x:'4',y:'4'}});
 assert.deepEqual(h.data.game.world,{x:4,y:4,visited:['F']});
 assert.deepEqual(JSON.parse(h.getSavedGame()).world,h.data.game.world);
});
