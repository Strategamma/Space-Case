import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLES,DEFAULT_SETTINGS,isHollow,canHunt,scansAsHollow,powerRole} from '../public/roles.js';
import {createRoom,addPlayer,act,tick,project,ensureAvatars} from '../server/game.js';
import {abilityView,huntView,resolveAbilities} from '../server/abilities.js';
import {startingReports,deliverReports,nightReports,dealPool} from '../server/moderator.js';
import {allowedDeal,poolError} from '../public/setup.js';
function scenario(roles,day=2) {
  const room=createRoom('Crew 0');while(room.players.length<roles.length)addPlayer(room,'Crew '+room.players.length);
  roles.forEach((role,i)=>Object.assign(room.players[i],{role,revealed:true,acknowledged:true}));
  room.phase='aftermath';room.day=day-1;let now=Date.now()+5000;
  const command=(i,action,data={})=>act(room,room.players[i].id,action,data,now);
  command(0,'night');
  return {room,p:room.players,now:()=>now,command,
    use:(i,indices,mode)=>command(i,'ability',{targets:indices.map(j=>room.players[j].id),...(mode?{mode}:{})}),
    pass:i=>command(i,'ability',{pass:true}),hunt:(i,j)=>command(i,'hunt',{targets:[room.players[j].id]}),
    dawn:()=>{now=room.deadline;tick(room,now);},next:()=>{room.phase='aftermath';command(0,'night');},
    texts:i=>room.players[i].reports.map(r=>r.text).join('\n')};
}
const crewRoles=Object.keys(ROLES).filter(r=>!isHollow(r)&&r!=='echo');
for(const role of crewRoles)test(`Echo copies ${ROLES[role].name} only from next night with stored resources`,()=>{
  const s=scenario(['echo','hollow',role,'cadet','cadet','cadet']);s.p[2].alive=false;s.p[2].usedOnce=true;s.p[2].sentinelUsed=true;s.p[2].inherited=true;s.p[2].boundId=s.p[4].id;
  s.use(0,[2]);s.dawn();assert.equal(powerRole(s.p[0]),'echo');assert.equal(s.p[0].echoPending.role,role);assert.equal(s.p[0].echoSpent,true);
  assert.match(s.texts(0),/Activates next dark cycle/);s.next();
  assert.equal(s.p[0].role,'echo');assert.equal(powerRole(s.p[0]),role);assert.equal(s.p[0].usedOnce,true);assert.equal(s.p[0].sentinelUsed,true);assert.equal(s.p[0].boundId,s.p[4].id);assert.equal(s.p[0].inherited,true);
  if(ROLES[role].action?.once)assert.equal(abilityView(s.room,s.p[0],s.now()).active,false);
  if(['warden','beacon'].includes(role))assert.equal(abilityView(s.room,s.p[0],s.now()).active,false);
  assert.equal(project(s.room,s.p[1].id).players[0].echoRole,undefined);
});
test('Echo target list contains every dead seat and no hidden allegiance/character filters',()=>{
  const s=scenario(['echo','hollow','engineer','thrall','echo','cadet']);for(const i of [1,2,3,4])s.p[i].alive=false;
  s.room.settings.reveal=false;const view=project(s.room,s.p[0].id);
  assert.deepEqual(view.me.orders.ability.targets,s.p.slice(1,5).map(p=>p.id));
  assert.ok(view.players.slice(1,5).every(p=>p.role===undefined));assert.throws(()=>s.use(0,[5]),/eligible/);
});
for(const role of ['echo',...Object.keys(ROLES).filter(isHollow)])test(`Echo spends invalid ${role} copy without disclosing failure reason`,()=>{
  const s=scenario(['echo','hollow',role,'cadet','cadet','cadet']);s.p[2].alive=false;s.use(0,[2]);s.dawn();
  assert.equal(s.texts(0),'Nothing happened.');assert.equal(s.p[0].usedOnce,true);assert.equal(s.p[0].echoPending,undefined);s.next();assert.throws(()=>s.use(0,[2]),/spent/);
});
test('Echo copying is silently jammed without spending use; target revival does not invalidate a copy',()=>{
  const jam=scenario(['echo','jammer','medic','cadet','cadet','cadet']);jam.p[2].alive=false;jam.use(0,[2]);jam.use(1,[0]);jam.dawn();assert.equal(jam.texts(0),'');assert.equal(jam.p[0].usedOnce,false);assert.equal(jam.p[0].echoPending,undefined);
  const s=scenario(['echo','hollow','resonance','medic','cadet','cadet']);s.p[2].alive=false;s.p[2].diedDay=1;s.use(0,[2]);s.use(3,[2]);s.dawn();assert.equal(s.p[2].alive,true);assert.equal(s.p[0].echoPending.role,'resonance');
});
test('Copied scan works through validation/resolution, can be delayed, and exact inspections still identify Echo',()=>{
  const s=scenario(['echo','forger','xenobiologist','thief','cadet','cadet']);s.p[2].alive=false;s.use(0,[2]);s.dawn();s.next();
  s.use(0,[1]);s.use(1,[0]);s.use(3,[0]);s.dawn();assert.match(s.texts(3),/Crew 0: Echo/);assert.doesNotMatch(s.texts(0),/Hollow signature detected/);
  s.next();s.dawn();assert.match(s.texts(0),/Hollow signature detected/);
});
test('Copied Sentinel and Warden protection works alongside original power owners',()=>{
  const s=scenario(['echo','hollow','sentinel','cadet','cadet','cadet']);s.p[2].alive=false;s.use(0,[2]);s.dawn();s.next();s.hunt(1,0);s.dawn();assert.equal(s.p[0].alive,true);assert.equal(s.p[0].sentinelUsed,true);
  const w=scenario(['echo','hollow','warden','warden','cadet','cadet']);w.p[2].alive=false;w.p[2].boundId=w.p[4].id;w.p[3].boundId=w.p[5].id;w.use(0,[2]);w.dawn();w.next();w.hunt(1,4);w.dawn();assert.equal(w.p[4].alive,true);
});
test('Copied Medic revives and multiple committed Medics receive the same factual result',()=>{
  const s=scenario(['echo','hollow','medic','medic','cadet','cadet']);s.p[2].alive=false;s.p[2].diedDay=1;s.use(0,[2]);s.dawn();s.next();
  s.p[4].alive=false;s.p[4].diedDay=2;s.use(0,[4]);s.use(3,[4]);s.dawn();assert.equal(s.p[4].alive,true);assert.match(s.texts(0),/Crew 4 revived/);assert.match(s.texts(3),/Crew 4 revived/);assert.equal(s.p[0].usedOnce,true);
});
test('Echo pending/active powers survive restoration and revival, then reset on rematch',()=>{
  const s=scenario(['echo','hollow','stasis','medic','cadet','cadet']);s.p[2].alive=false;s.use(0,[2]);s.dawn();
  const restored=JSON.parse(JSON.stringify(s.room));ensureAvatars(restored);assert.deepEqual(restored.players[0].echoPending,s.p[0].echoPending);
  s.next();s.use(0,[4]);s.hunt(1,0);s.dawn();assert.equal(s.p[0].alive,false);assert.equal(s.p[0].usedOnce,true);
  s.next();s.use(3,[0]);s.dawn();s.next();assert.equal(powerRole(s.p[0]),'stasis');assert.equal(s.p[0].usedOnce,true);
  s.room.phase='victory';s.command(0,'rematch');assert.equal(s.p[0].echoRole,undefined);assert.equal(s.p[0].echoPending,undefined);assert.equal(s.p[0].echoSpent,false);
});
test('Thrall scans as Crew across allegiance investigators but exact character reports remain factual',()=>{
  for(const [role,targets,expected] of [['xenobiologist',[2],/no Hollow signature/],['analyst',[2,3],/no Hollow signatures/],['resonance',[2,3],/same allegiance/],['cartographer',[2,3,4],/0 Hollow/]]){
    const s=scenario([role,'hollow','thrall','cadet','cadet','cadet']);s.use(0,targets);s.dawn();assert.match(s.texts(0),expected,role);
  }
  const proximity=scenario(['proximity','thrall','hollow','cadet','cadet','cadet']);proximity.dawn();assert.match(proximity.texts(0),/0 Hollow/);
  const survey=scenario(['surveyor','hollow','thrall','cadet','cadet','cadet'],1);survey.dawn();assert.match(survey.texts(0),/0 adjacent Hollow pairs/);
  const exact=scenario(['thief','hollow','thrall','cadet','cadet','cadet']);exact.use(0,[2]);exact.dawn();assert.match(exact.texts(0),/Crew 2: Thrall/);
});
test('Thrall receives no starting network or attack vote; its true-evil check remains available after consensus',()=>{
  const s=scenario(['thrall','hollow','cadet','cadet','cadet','cadet']);deliverReports(s.room,startingReports(s.room));
  assert.equal(s.texts(0),'');assert.ok(!s.texts(1).includes('Crew 0'));
  assert.equal(project(s.room,s.p[0].id).hollow,null);assert.equal(project(s.room,s.p[1].id).hollow.members.length,1);
  assert.equal(huntView(s.room,s.p[0],s.now()).active,false);assert.throws(()=>s.hunt(0,2),/living Hollow/);
  s.hunt(1,2);assert.equal(s.room.lockedTarget,s.p[2].id);s.use(0,[1]);s.dawn();assert.match(s.texts(0),/Hollow allegiance/);assert.equal(s.p[0].usedOnce,true);
});
test('Thrall counts as evil for parity, Crew victory and winning points, never as sole dealt attacker',()=>{
  assert.equal(isHollow('thrall'),true);assert.equal(canHunt('thrall'),false);assert.equal(scansAsHollow('thrall'),false);
  const s=scenario(['hollow','thrall','cadet','cadet','cadet','cadet']);s.p[4].alive=false;s.p[5].alive=false;s.dawn();assert.equal(s.room.winner,'hollow');assert.equal(s.p[1].score,1);
  const t=scenario(['hollow','thrall','cadet','cadet','cadet','cadet']);t.p[0].alive=false;t.dawn();assert.notEqual(t.room.winner,'crew');
  assert.equal(allowedDeal(['thrall','xenobiologist','cadet','cadet','cadet','cadet']),false);
  const roles={...Object.fromEntries(Object.keys(DEFAULT_SETTINGS.roles).map(k=>[k,0])),cadet:5,thrall:1,hollow:1,xenobiologist:1,echo:1};assert.equal(poolError(6,roles),null);
  for(const choose of [()=>0,n=>n-1])assert.ok(dealPool(6,roles,choose).assigned.some(canHunt));
});
test('Hostile selectors do not reveal Thrall through exclusions; legacy helper scans use Crew registration',()=>{
  const s=scenario(['jammer','thrall','hollow','xenobiologist','cadet','cadet']);assert.ok(abilityView(s.room,s.p[0],s.now()).targets.includes(s.p[1].id));
  s.room.nightChoices[s.p[3].id]=[s.p[1].id];assert.match(nightReports(s.room).find(r=>r.recipient===s.p[3].id).text,/no Hollow signature/);
});

test('Echo killed on copying night gains no pending identity information until a later revival/activation',()=>{
  const s=scenario(['echo','hollow','xenobiologist','medic','cadet','cadet']);s.p[2].alive=false;s.use(0,[2]);s.hunt(1,0);s.dawn();
  assert.equal(s.texts(0),'');const view=project(s.room,s.p[0].id);assert.equal(view.me.echo.role,null);assert.equal(view.me.echo.pending,false);
  assert.equal(view.me.powerRole,'echo');s.next();s.use(3,[0]);s.dawn();assert.equal(s.p[0].alive,true);s.next();assert.equal(powerRole(s.p[0]),'xenobiologist');
});
test('Copied repeatable and one-use powers use their own target counts, modes and effects',()=>{
  for(const [role,indices,mode,pattern] of [['analyst',[1,3],undefined,/at least one Hollow/],['resonance',[1,3],undefined,/different allegiances/],['engineer',[3,4],undefined,/Neither selected/],['cartographer',[1,3,4],undefined,/1 Hollow/],['arbiter',[3],'noVote',null],['diver',[2],undefined,/Crew 2: Memory Diver/]]) {
    const s=scenario(['echo','hollow',role,'cadet','cadet','cadet']);s.p[2].alive=false;s.p[2].inherited=true;s.use(0,[2]);s.dawn();s.next();
    const view=abilityView(s.room,s.p[0],s.now());assert.equal(view.active,true,role);assert.equal(view.count,indices.length,role);
    s.use(0,indices,mode);s.dawn();if(pattern)assert.match(s.texts(0),pattern,role);else assert.equal(s.p[3].status.noVote,true);
  }
});
test('Copied first-night knowledge and transmissions do not restart their expired windows',()=>{
  for(const role of ['observer','beacon','surveyor']) {
    const s=scenario(['echo','hollow',role,'cadet','cadet','cadet']);s.p[2].alive=false;s.use(0,[2]);s.dawn();s.next();s.dawn();
    assert.ok(s.p[0].reports.every(r=>!['observatory','beacon','survey'].includes(r.kind)),role);
  }
});
test('Thrall once check can be silently jammed or delayed and never unlocks network access',()=>{
  const jam=scenario(['thrall','jammer','hollow','cadet','cadet','cadet']);jam.use(0,[2]);jam.use(1,[0]);jam.dawn();assert.equal(jam.texts(0),'');assert.equal(jam.p[0].usedOnce,false);
  const delay=scenario(['thrall','forger','hollow','cadet','cadet','cadet']);delay.use(0,[2]);delay.use(1,[0]);delay.dawn();assert.doesNotMatch(delay.texts(0),/Hollow allegiance/);delay.next();delay.dawn();assert.match(delay.texts(0),/Hollow allegiance/);assert.equal(project(delay.room,delay.p[0].id).hollow,null);
});

test('Echo copies passive Assistant without inheriting a scan or requiring Xenobiologist',()=>{
  const s=scenario(['echo','hollow','assistant','cadet','cadet','cadet']);s.p[2].alive=false;s.use(0,[2]);s.dawn();
  s.next();assert.equal(abilityView(s.room,s.p[0],s.now()).active,false);s.hunt(1,3);s.dawn();
  assert.match(s.texts(0),/No dark cycle casualty had a Hollow signature/);
});
