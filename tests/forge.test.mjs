import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const normalizer=html.slice(html.indexOf('const GAME_MATERIALS='),html.indexOf('const defaults='));
const game=html.slice(html.indexOf('/* Journey derives'),html.indexOf('function home(){'));

function harness(gameState={enabled:true,awards:[],claims:[],rewards:[],crafted:[]}){
 const data={game:gameState};let next=0;
 const messages=[],toasts=[];let failNextCommit=false,renderCount=0,savedGame=null;
 const api=new Function('data','showToast','id','esc','calLondonToday','calStartWeek','commit','render','confirm',normalizer+'\n'+game+`\nreturn {
  gameAward,gameNormalize,gameMaterials:typeof gameMaterials==='function'?gameMaterials:null,
  gameCraft:typeof gameCraft==='function'?gameCraft:null,
  gameSkillTotals,gameFurnitureSprite,gameTotals,
  gamePlace:typeof gamePlace==='function'?gamePlace:null,
  gameUnplace:typeof gameUnplace==='function'?gameUnplace:null,
  gameScreen,gameAction,setTab(tab){gameTab=tab}
 };`)(data,message=>toasts.push(message),()=>`item-${++next}`,v=>String(v),()=>'2026-11-08',()=> '2026-11-02',v=>{
  if(failNextCommit){failNextCommit=false;return false;}
  savedGame=JSON.stringify(data.game);messages.push(v);renderCount++;return true;
 },()=>{renderCount++;},()=>true);
 return {data,messages,toasts,...api,failNextSave(){failNextCommit=true},getSavedGame(){return savedGame},getRenderCount(){return renderCount}};
}

test('failed reward redemption restores coins and prior claims, then retry spends only once',()=>{
 const h=harness();
 for(let n=0;n<5;n++)h.gameAward('task','task:reward-'+n);
 const claim=()=>h.gameAction({dataset:{action:'game-claim',id:'break'}});
 claim();
 const before=JSON.stringify(h.data.game),saved=h.getSavedGame();
 assert.equal(h.gameTotals().coins,35);
 h.failNextSave();
 claim();
 assert.equal(JSON.stringify(h.data.game),before,'failed save must not retain a phantom redemption');
 assert.equal(h.gameTotals().coins,35,'failed save must not spend coins');
 assert.equal(h.getSavedGame(),saved);
 assert.equal(h.messages.length,1,'failed redemption must not announce success');
 claim();
 assert.equal(h.data.game.claims.length,2);
 assert.equal(h.gameTotals().coins,15);
 assert.equal(h.gameNormalize(JSON.parse(h.getSavedGame())).claims.length,2);
 claim();
 assert.equal(h.data.game.claims.length,2,'insufficient balance must not add a claim');
});

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

test('demanding one-time tasks award additional crafting material without reducing legacy supply',()=>{
 const h=harness();
 h.gameAward('task','task:ordinary',{xp:20,coins:5,skill:'focus'});
 assert.deepEqual(h.gameMaterials(),{timber:2,iron:1,fibre:0,essence:0});
 h.gameAward('task','task:demanding',{xp:70,coins:18,skill:'craft'});
 assert.deepEqual(h.gameMaterials(),{timber:5,iron:2,fibre:0,essence:0});
 h.gameAward('task','task:major',{xp:100,coins:25,skill:'craft'});
 assert.deepEqual(h.gameMaterials(),{timber:9,iron:4,fibre:0,essence:0});
 assert.equal(h.gameAward('task','task:major',{xp:100,coins:25,skill:'craft'}),false);
 assert.equal(h.gameMaterials().timber,9);
});

test('Workbench blueprint requires Craftsmanship 2; stock alone cannot bypass its gate',()=>{
 const h=harness();
 for(let n=1;n<=4;n++)h.gameAward('task','task:stock-'+n,{xp:20,coins:5,skill:'focus'});
 assert.deepEqual({timber:h.gameMaterials().timber,iron:h.gameMaterials().iron},{timber:8,iron:4});
 assert.equal(h.gameSkillTotals().craft.level,1);
 assert.equal(h.gameCraft('workbench'),false);
 h.gameAward('task','task:craft-49',{xp:49,coins:12,skill:'craft'});
 assert.equal(h.gameSkillTotals().craft.level,1);
 assert.equal(h.gameCraft('workbench'),false);
 h.gameAward('task','task:craft-1',{xp:1,coins:1,skill:'craft'});
 assert.equal(h.gameSkillTotals().craft.level,2);
 assert.equal(h.gameCraft('workbench'),true);
 assert.equal(h.data.game.crafted.at(-1).recipeId,'workbench');
});

test('imported crafted items cannot bypass earned skill requirements, but valid unlocks survive restoration',()=>{
 const h=harness();
 const awards=[1,2,3,4].map(n=>({key:'task:stock-'+n,kind:'task',xp:20,coins:5,at:n,skill:'focus'}));
 const item={id:'old-bench',recipeId:'workbench',at:5,slot:'2'};
 assert.deepEqual(h.gameNormalize({awards,crafted:[item]}).crafted,[]);
 awards.push({key:'task:craft-gain',kind:'task',xp:50,coins:13,at:5,skill:'craft'});
 const restored=h.gameNormalize({awards,crafted:[item]});
 assert.deepEqual(restored.crafted,[{id:'old-bench',recipeId:'workbench',at:5,slot:'2'}]);
 assert.deepEqual(h.gameNormalize({awards:awards.slice(0,4),crafted:[item]}).crafted,[]);
});

test('Workshop shows the next skill blueprint and locked requirements, then enables the unlock at level 2',()=>{
 const h=harness();h.setTab('forge');
 const locked=h.gameScreen();
 assert.match(locked,/Ironwood workbench/);
 assert.match(locked,/Craftsmanship · Lvl 2/);
 assert.match(locked,/Craftsmanship · Lvl 2 · You’re Lvl 1/);
 assert.match(locked,/data-action="game-craft" data-id="workbench" disabled/);
 assert.match(locked,/Next blueprints/);
 h.gameAward('task','task:carpentry',{xp:50,coins:13,skill:'craft'});
 assert.match(h.gameScreen(),/Need 1 timber · 2 iron/);
 for(let n=0;n<3;n++)h.gameAward('task','task:materials-'+n,{xp:20,coins:5,skill:'focus'});
 const unlocked=h.gameScreen();
 assert.doesNotMatch(unlocked,/data-action="game-craft" data-id="workbench" disabled/);
 assert.match(unlocked,/Available · Craftsmanship · Lvl 2/);
});

test('Workshop keeps exploration blueprints separate from skill gates and reflects discoveries',()=>{
 const h=harness();h.setTab('forge');
 const initial=h.gameScreen();
 assert.match(initial,/Explore Copper Quarry to unlock/);
 assert.match(initial,/data-action="game-craft" data-id="anvil" disabled/);
 assert.match(initial,/6 \/ 22 unlocked/);
 for(let n=0;n<3;n++)h.gameAward('task','task:trail-'+n,{xp:20,coins:5,skill:'focus'});
 for(const id of ['1','2','6'])h.gameAction({dataset:{action:'game-explore',id}});
 assert.deepEqual(h.data.game.explored,['1','2','6']);
 const explored=h.gameScreen();
 assert.match(explored,/Discovered at Copper Quarry/);
 assert.doesNotMatch(explored,/data-action="game-craft" data-id="anvil" disabled/);
 assert.match(explored,/7 \/ 22 unlocked/);
});

test('tapping the already-selected room finish is a silent no-op',()=>{
 const h=harness({enabled:true,awards:[],claims:[],rewards:[],crafted:[],roomStyle:'foundry'});
 h.gameAction({dataset:{action:'game-style',style:'foundry'}});
 assert.deepEqual(h.toasts,[]);
 assert.deepEqual(h.messages,[]);
 assert.equal(h.data.game.roomStyle,'foundry');
});

test('newly unlocked furniture has distinct nonempty pixel artwork',()=>{
 const h=harness();
 for(const item of ['workbench','bookcase','trainingmat','hearth','drawingdesk','strongbox','readingchair','clock']){
  const art=h.gameFurnitureSprite(item);
  assert.match(art,/<rect /,`${item} has artwork`);
  assert.ok((art.match(/<rect /g)||[]).length>=4,`${item} has detailed artwork`);
 }
});

test('new room finishes preserve old backups, reject unknown values and remain selectable only when unlocked',()=>{
 const h=harness();h.setTab('forge');
 assert.equal(h.gameNormalize({}).roomStyle,'foundry');
 assert.equal(h.gameNormalize({roomStyle:'moss'}).roomStyle,'foundry');
 assert.equal(h.gameNormalize({roomStyle:'moss',awards:[{key:'task:home-project',kind:'task',xp:50,coins:13,at:1,skill:'home'}]}).roomStyle,'moss');
 assert.equal(h.gameNormalize({roomStyle:'unsafe-injection'}).roomStyle,'foundry');
 assert.match(h.gameScreen(),/data-action="game-style" data-style="moss"[^>]*disabled/);
 h.gameAction({dataset:{action:'game-style',style:'moss'}});
 assert.equal(h.data.game.roomStyle,undefined);
 h.gameAward('task','task:make-home',{xp:50,coins:13,skill:'home'});
 h.gameAction({dataset:{action:'game-style',style:'moss'}});
 assert.equal(h.data.game.roomStyle,'moss');
 assert.equal(JSON.parse(h.getSavedGame()).roomStyle,'moss');
 assert.match(h.gameScreen(),/data-room-style="moss"/);
 assert.match(h.gameScreen(),/data-action="game-style" data-style="moss"[^>]*aria-pressed="true"/);
});

test('failed room finish save rolls back without losing furniture and allows retry',()=>{
 const h=harness();
 h.gameAward('task','task:homemaking',{xp:50,coins:13,skill:'home'});
 h.gameCraft('stool');
 const before=JSON.stringify(h.data.game),saved=h.getSavedGame();
 h.failNextSave();h.gameAction({dataset:{action:'game-style',style:'moss'}});
 assert.equal(JSON.stringify(h.data.game),before);
 assert.equal(h.getSavedGame(),saved);
 h.gameAction({dataset:{action:'game-style',style:'moss'}});
 assert.equal(h.data.game.roomStyle,'moss');
 assert.equal(h.data.game.crafted.length,1);
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

test('settlement rooms unlock from real deeds and can be switched and furnished',()=>{
 const h=harness();h.setTab('forge');
 assert.match(h.gameScreen(),/The Greenhouse/);
 assert.match(h.gameScreen(),/Unlock at 5 deeds/);
 assert.equal(h.gamePlace('missing','grove:1'),false);
 assert.equal(h.gameAction({dataset:{action:'game-room',room:'grove'}}),false);
 for(let n=0;n<5;n++)h.gameAward('task',`task:${n}`);
 assert.equal(h.data.game.awards.length,6,'first-five milestone must not count as a deed');
 assert.match(h.gameScreen(),/Unlock at 15 deeds/);
 h.gameAward('habit','habit:a:2026-11-08');
 h.gameAward('habit','habit:b:2026-11-08');
 assert.equal(h.gameCraft('books'),true);
 const piece=h.data.game.crafted[0];
 h.gameAction({dataset:{action:'game-room',room:'grove'}});
 assert.match(h.gameScreen(),/Customisable The Greenhouse room/);
 h.gameAction({dataset:{action:'game-select',id:piece.id}});
 h.gameAction({dataset:{action:'game-slot',slot:'grove:8'}});
 assert.equal(piece.slot,'grove:8');
 assert.match(h.gameScreen(),/data-slot="grove:8"/);
 assert.equal(h.gamePlace(piece.id,'study:1'),false,'unlocked crafts cannot bypass a locked room');
 for(let n=5;n<13;n++)h.gameAward('task',`task:${n}`);
 h.gameAction({dataset:{action:'game-room',room:'study'}});
 assert.match(h.gameScreen(),/Customisable The Observatory room/);
 assert.match(h.gameScreen(),/3 \/ 3/);
});

test('locked blueprints cannot be crafted and restored room slots preserve legacy layouts',()=>{
 const h=harness();h.setTab('forge');
 for(let n=0;n<4;n++)h.gameAward('task',`task:${n}`);
 assert.equal(h.gameCraft('desk'),false);
 assert.match(h.gameScreen(),/Build a world from real wins/);
 const legacy=h.gameNormalize({awards:h.data.game.awards,crafted:[{id:'old',recipeId:'stool',at:10,slot:'4'}]});
 assert.equal(legacy.crafted[0].slot,'4');
 const newer=h.gameNormalize({awards:h.data.game.awards,crafted:[
  {id:'garden',recipeId:'plant',at:11,slot:'grove:2'},
  {id:'duplicate',recipeId:'plant',at:12,slot:'grove:2'},
  {id:'injected',recipeId:'plant',at:13,slot:'unknown:9'}
 ]});
 assert.deepEqual(newer.crafted.map(c=>c.id),[],'unearned crafting materials must not be manufactured by imports');
 const withFibre=h.gameNormalize({awards:[...h.data.game.awards,
  {kind:'habit',key:'habit:1',xp:10,coins:3,at:3},
  {kind:'habit',key:'habit:2',xp:10,coins:3,at:4}
 ],crafted:[{id:'garden',recipeId:'plant',at:11,slot:'grove:2'},{id:'duplicate',recipeId:'plant',at:12,slot:'grove:2'},{id:'bad',recipeId:'plant',at:13,slot:'fake:8'}]});
 assert.deepEqual(withFibre.crafted.map(c=>c.id),['garden']);
 assert.equal(withFibre.crafted[0].slot,'grove:2');
});

test('restoring a save cannot place inventory in a room before its deed unlock',()=>{
 const h=harness();
 const awards=[1,2].map(n=>({kind:'habit',key:'habit:'+n,xp:10,coins:3,at:n}));
 const item={id:'restored-plant',recipeId:'plant',at:5,slot:'grove:2'};
 assert.deepEqual(h.gameNormalize({awards,crafted:[item]}).crafted,[]);
 const unlocked=[...awards,...[1,2,3].map(n=>({kind:'task',key:'task:'+n,xp:20,coins:5,at:n+2,skill:'focus'}))];
 assert.deepEqual(h.gameNormalize({awards:unlocked,crafted:[item]}).crafted,[item]);
});
