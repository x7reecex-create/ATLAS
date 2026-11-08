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
  gameScreen,gameAction,gameGoalProgress:typeof gameGoalProgress==='function'?gameGoalProgress:null,setTab(tab){gameTab=tab}
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

test('crafting goal survives a backup and rejects unknown or malformed recipe IDs',()=>{
 const h=harness();
 assert.equal(h.gameNormalize({}).craftGoal,'');
 for(const craftGoal of ['missing',{},null,42,'<script>'])assert.equal(h.gameNormalize({craftGoal}).craftGoal,'');
 h.gameAction({dataset:{action:'game-track',id:'bed'}});
 assert.equal(h.data.game.craftGoal,'bed');
 assert.equal(h.gameNormalize(JSON.parse(h.getSavedGame())).craftGoal,'bed');
 h.gameAction({dataset:{action:'game-track',id:'missing'}});
 assert.equal(h.data.game.craftGoal,'bed');
});

test('goal progress caps each material and does not double-count one action supplying two resources',()=>{
 const h=harness();
 assert.equal(typeof h.gameGoalProgress,'function');
 h.gameAction({dataset:{action:'game-track',id:'bed'}});
 let p=h.gameGoalProgress();
 assert.equal(p.collected,0);assert.equal(p.required,12);
 assert.equal(p.tasks,3);assert.equal(p.habits,2);assert.equal(p.ready,false);
 h.gameAward('task','task:a');h.gameAward('task','task:b');
 h.gameAward('habit','habit:a');
 p=h.gameGoalProgress();
 assert.equal(p.collected,8);assert.equal(p.percent,66);
 assert.equal(p.tasks,1);assert.equal(p.habits,1);
 assert.deepEqual(p.missing,{timber:2,iron:0,fibre:2});
 h.gameAward('task','task:c');h.gameAward('habit','habit:b');
 p=h.gameGoalProgress();
 assert.equal(p.ready,true);assert.equal(p.percent,100);assert.equal(p.collected,12);
 assert.equal(p.tasks,0);assert.equal(p.habits,0);
});

test('goal tracking and clearing roll back after failed saves and cannot mutate while paused',()=>{
 const h=harness();h.gameAction({dataset:{action:'game-track',id:'stool'}});
 h.failNextSave();h.gameAction({dataset:{action:'game-track',id:'bed'}});
 assert.equal(h.data.game.craftGoal,'stool');
 assert.equal(JSON.parse(h.getSavedGame()).craftGoal,'stool');
 h.failNextSave();h.gameAction({dataset:{action:'game-track',id:''}});
 assert.equal(h.data.game.craftGoal,'stool');
 h.data.game.enabled=false;
 h.gameAction({dataset:{action:'game-track',id:'bed'}});
 assert.equal(h.data.game.craftGoal,'stool');
 h.data.game.enabled=true;
 h.gameAction({dataset:{action:'game-track',id:''}});
 assert.equal(h.data.game.craftGoal,'');assert.equal(h.gameGoalProgress(),null);
});

test('only successful target crafting clears a goal; other crafts recalculate its available stock',()=>{
 const h=harness();
 h.gameAction({dataset:{action:'game-track',id:'shelf'}});
 h.gameAward('task','task:a');h.gameAward('task','task:b');
 assert.equal(typeof h.gameGoalProgress,'function');
 assert.equal(h.gameGoalProgress().ready,true);
 h.gameAction({dataset:{action:'game-craft',id:'stool'}});
 assert.equal(h.data.game.craftGoal,'shelf');
 assert.equal(h.gameGoalProgress().tasks,1);
 h.gameAward('task','task:c');
 const before=JSON.stringify(h.data.game);
 h.failNextSave();h.gameAction({dataset:{action:'game-craft',id:'shelf'}});
 assert.equal(JSON.stringify(h.data.game),before);
 h.gameAction({dataset:{action:'game-craft',id:'shelf'}});
 assert.equal(h.data.game.craftGoal,'');
 assert.equal(h.data.game.crafted.length,2);
 h.gameAction({dataset:{action:'game-slot',slot:'6'}});
 assert.equal(h.data.game.crafted[1].slot,'6');
});

test('surplus of one material cannot hide missing material or round an unfinished goal to 100 percent',()=>{
 const h=harness();
 assert.equal(typeof h.gameGoalProgress,'function');
 h.gameAction({dataset:{action:'game-track',id:'lamp'}});
 for(let i=0;i<4;i++)h.gameAward('task','task:'+i);
 const p=h.gameGoalProgress();
 assert.equal(p.ready,false);assert.equal(p.percent,50);
 assert.equal(p.tasks,0);assert.equal(p.habits,2);
 assert.deepEqual(p.missing,{iron:0,essence:2});
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
 const {gameScreen,setTab}=harness();setTab('forge');
 const view=gameScreen();
 assert.match(view,/Workshop/);
 assert.match(view,/Foundry stool/);
 assert.match(view,/data-action="game-craft" data-id="stool"/);
 assert.equal((view.match(/data-action="game-slot"/g)||[]).length,9);
 assert.match(view,/TIMBER/);
 assert.match(view,/0 available/);
});

test('Workshop buttons craft, choose an item, place it in a chosen room space and pick it up',()=>{
 const {data,gameAward,gameAction,setTab,gameScreen}=harness();setTab('forge');
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
