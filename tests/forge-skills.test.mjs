import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const normalizer=html.slice(html.indexOf('const GAME_MATERIALS='),html.indexOf('const defaults='));
const game=html.slice(html.indexOf('/* Journey derives'),html.indexOf('function home(){'));

function harness(){
 const data={game:{enabled:true,awards:[],claims:[],rewards:[],crafted:[]},tasks:[],habits:[],habitLogs:[],displayName:''};
 const api=new Function('data','showToast','esc','calLondonToday','calStartWeek','byPriority',normalizer+'\n'+game+`
 return {gameTaskReward,gameAward,gameSkillTotals,gameLevel,gameTotals,gameNormalize,gameScreen,gameTaskRow,setTab(t){gameTab=t}};
 `)(data,()=>{},String,()=>'2026-11-08',()=> '2026-11-02',()=>0);
 return {data,...api};
}

test('task rewards scale with estimated minutes and priority, with bounded grants',()=>{
 const {gameTaskReward}=harness();
 const tiny=gameTaskReward({durationMins:5,priority:'low',forgeSkill:'home'});
 const normal=gameTaskReward({durationMins:30,priority:'normal',forgeSkill:'focus'});
 const big=gameTaskReward({durationMins:120,priority:'high',forgeSkill:'craft'});
 const huge=gameTaskReward({durationMins:720,priority:'high',forgeSkill:'craft'});
 assert.deepEqual(tiny,{xp:4,coins:1,skill:'home'});
 assert.deepEqual(normal,{xp:20,coins:5,skill:'focus'});
 assert.deepEqual(big,{xp:70,coins:18,skill:'craft'});
 assert.deepEqual(huge,{xp:100,coins:25,skill:'craft'});
 assert.ok(tiny.xp<normal.xp&&normal.xp<big.xp&&big.xp<=huge.xp);
});

test('awards lock the skill and XP at first completion; reopening and edited estimates cannot farm',()=>{
 const {data,gameTaskReward,gameAward,gameSkillTotals,gameTotals}=harness();
 const reward=gameTaskReward({durationMins:120,priority:'high',forgeSkill:'craft'});
 assert.equal(gameAward('task','task:large',reward),true);
 assert.equal(gameAward('task','task:large',gameTaskReward({durationMins:720,priority:'high',forgeSkill:'finance'})),false);
 assert.deepEqual(data.game.awards[0].skill,'craft');
 assert.equal(data.game.awards[0].xp,70);
 assert.equal(gameTotals().xp,70);
 assert.equal(gameSkillTotals().craft.xp,70);
 assert.equal(gameSkillTotals().finance.xp,0);
});

test('independent skills have their own levels and preserve older untagged awards',()=>{
 const {data,gameAward,gameSkillTotals}=harness();
 gameAward('task','task:work',{xp:70,coins:18,skill:'craft'});
 gameAward('task','task:study',{xp:30,coins:8,skill:'knowledge'});
 gameAward('habit','habit:exercise:2026-11-08');
 data.game.awards.push({kind:'task',key:'task:legacy',xp:20,coins:5,at:1});
 const skills=gameSkillTotals();
 assert.equal(skills.craft.xp,70);
 assert.equal(skills.knowledge.xp,30);
 assert.equal(skills.discipline.xp,10);
 assert.equal(skills.focus.xp,20);
 assert.equal(skills.fitness.xp,0);
 assert.ok(skills.craft.level>skills.knowledge.level);
});

test('level maths is stable well beyond level 999 with no artificial level cap',()=>{
 const {gameLevel}=harness();
 const n=1000,threshold=25*n*(n+5)/2;
 assert.deepEqual(gameLevel(threshold),{level:1001,levelXP:0,levelNeeded:75+25*n});
 assert.deepEqual(gameLevel(threshold+42),{level:1001,levelXP:42,levelNeeded:75+25*n});
 assert.equal(gameLevel(0).level,1);
});

test('new skill awards survive normalisation and invalid skill claims are rejected',()=>{
 const {gameNormalize}=harness();
 const legacy={key:'task:old',kind:'task',xp:20,coins:5,at:1};
 const current={key:'task:new',kind:'task',xp:70,coins:18,at:2,skill:'craft'};
 const normalized=gameNormalize({awards:[legacy,current,{...current,key:'task:bad',skill:'undefined'}]});
 assert.deepEqual(normalized.awards,[legacy,current]);
});

test('a legacy task row shows its historical Focus attribution even after task edits',()=>{
 const h=harness(),task={id:'legacy',title:'Old project',done:true,repeat:'none',category:'work',forgeSkill:'',due:''};
 h.data.game.awards.push({key:'task:legacy',kind:'task',xp:20,coins:5,at:1});
 assert.match(h.gameTaskRow(task),/Focus · Earned \+20 XP/);
 task.forgeSkill='finance';
 assert.match(h.gameTaskRow(task),/Focus · Earned \+20 XP/);
 assert.doesNotMatch(h.gameTaskRow(task),/Financial Stewardship/);
});

test('Journey exposes independent Skills section and task rewards are not all fixed at 20 XP',()=>{
 const {gameScreen,setTab,data}=harness();
 setTab('skills');
 const view=gameScreen();
 assert.match(view,/role="tab"[^>]*data-tab="skills"/);
 assert.match(view,/Craftsmanship/);
 assert.match(view,/Financial Stewardship/);
 assert.match(view,/Skill progress/);
 data.tasks=[{id:'t',title:'Important repair',durationMins:120,priority:'high',forgeSkill:'craft',repeat:'none',done:false,subtasks:[],due:''}];
 setTab('todos');
 const todo=gameScreen();
 assert.match(todo,/\+70 XP/);
 assert.doesNotMatch(todo,/Finish a task · \+20 XP/);
 assert.match(html,/dropdown\('forgeSkill'/);
});

test('failed task completion save leaves no phantom XP or completed quest; retry awards once',()=>{
 const task={id:'tidy',title:'Tidy workshop',done:false,repeat:'none',priority:'high',durationMins:120,forgeSkill:'home',focus:false};
 const data={tasks:[task],game:{enabled:true,awards:[],rewards:[],claims:[],crafted:[]}};
 let fail=true,saved=null;
 const commit=()=>{if(fail){fail=false;return false;}saved=JSON.stringify(data);return true;};
 const actions=html.slice(html.indexOf('function nextRecurring(t)'),html.indexOf('function deleteRecord('));
 const {toggleTask}=new Function('data','byId','commit','showToast','id','dateKey','dayDiff','normalizeTask','render',normalizer+'\n'+game+'\n'+actions+'\nreturn {toggleTask}')(data,(items,ref)=>items.find(item=>item.id===ref),commit,()=>{},()=> 'next',()=> '2026-11-08',()=>0,t=>t,()=>{});
 toggleTask('tidy',true);
 assert.equal(data.tasks[0].done,false);
 assert.equal(data.game.awards.length,0);
 assert.equal(saved,null);
 toggleTask('tidy',true);
 assert.equal(data.tasks[0].done,true);
 assert.equal(data.game.awards.length,1);
 assert.equal(data.game.awards[0].xp,70);
 assert.equal(JSON.parse(saved).game.awards.length,1);
});
