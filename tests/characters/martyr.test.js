import test from 'node:test';
import assert from 'node:assert/strict';
import { scenario } from '../helpers/character-scenario.js';
import { act, project, ensureAvatars } from '../../server/game.js';
import { ROLES, canHunt } from '../../public/roles.js';
import { poolError, randomPool, CARD_LIMITS } from '../../public/setup.js';

const roles=['martyr','hollow',...Array(6).fill('cadet')];
function execute(s,index=0) {
  s.room.phase='nominations';
  s.command(0,'nominate',{from:s.p[0].id,to:s.p[index].id});
  for(const [i,p] of s.p.entries()) if(p.alive&&p.playing&&!p.status?.noVote) s.command(i,'vote',{execute:true});
  s.command(0,'closeVote');
  assert.equal(s.room.phase,'nominations');
  assert.equal(s.room.winner,null);
  s.command(0,'execute');
}

test('Martyr wins alone only after an actual tribunal execution; score is awarded exactly once',()=>{
  const s=scenario(roles);s.dawn();execute(s);
  assert.equal(s.p[0].alive,false);assert.equal(s.room.winner,'martyr');assert.equal(s.room.phase,'victory');
  assert.equal(s.room.winnerId,s.p[0].id);assert.equal(s.p[0].score,1);
  assert.ok(s.p.slice(1).every(p=>p.score===0));
  assert.equal(project(s.room,s.p[2].id).winnerId,s.p[0].id);
  assert.throws(()=>s.command(0,'execute'),/phase/);assert.equal(s.p[0].score,1);
});
test('Hollow attack death does not trigger Martyr victory',()=>{
  const s=scenario(roles);s.hunt(1,0);s.dawn();
  assert.equal(s.p[0].alive,false);assert.equal(s.room.phase,'discussion');assert.equal(s.room.winner,null);assert.equal(s.p[0].score,0);
});
test('night jamming does not block the following daytime execution victory or notify Martyr',()=>{
  const s=scenario(['martyr','jammer',...Array(6).fill('cadet')]);s.use(1,[0]);s.dawn();
  assert.equal(s.texts(0),'');execute(s);assert.equal(s.room.winner,'martyr');
});
test('future daytime power-block status suppresses execution victory silently, while ordinary victory checks continue',()=>{
  const s=scenario(roles);s.dawn();s.p[0].status.abilityBlocked=true;
  assert.ok(!JSON.stringify(project(s.room,s.p[0].id)).includes('abilityBlocked'));
  assert.ok(!JSON.stringify(project(s.room,s.p[2].id)).includes('abilityBlocked'));
  const restored=JSON.parse(JSON.stringify(s.room));ensureAvatars(restored);
  assert.equal(restored.players[0].status.abilityBlocked,true);
  s.room=restored;
  // Continue through actual commands on the restored authoritative room.
  const ids=restored.players.map(p=>p.id);
  act(restored,ids[0],'nominations');
  act(restored,ids[0],'nominate',{from:ids[0],to:ids[0]});
  for(const id of ids)act(restored,id,'vote',{execute:true});
  act(restored,ids[0],'closeVote');act(restored,ids[0],'execute');
  assert.equal(restored.players[0].alive,false);assert.equal(restored.winner,null);assert.equal(restored.phase,'aftermath');
  assert.deepEqual(restored.players[0].reports,[]);
  assert.ok(restored.players.every(p=>p.score===0));
});
test('Cryo execution protection prevents death and Martyr victory',()=>{
  const s=scenario(['martyr','hollow','stasis',...Array(5).fill('cadet')]);s.use(2,[0]);s.dawn();execute(s);
  assert.equal(s.p[0].alive,true);assert.equal(s.room.phase,'aftermath');assert.equal(s.room.winner,null);
});
test('a tied highest ballot clears the block and never triggers Martyr victory',()=>{
  const s=scenario(roles);s.dawn();s.room.phase='nominations';
  for(const [from,to] of [[0,0],[2,3]]) {
    s.command(0,'nominate',{from:s.p[from].id,to:s.p[to].id});
    s.p.forEach((p,i)=>s.command(i,'vote',{execute:true}));s.command(0,'closeVote');
  }
  assert.equal(s.room.block,null);s.command(0,'execute');
  assert.equal(s.p[0].alive,true);assert.equal(s.room.winner,null);
});
test('Martyr counts alongside Crew for Hollow parity but never shares team victory',()=>{
  const s=scenario(['martyr','hollow','hollow',...Array(5).fill('cadet')]);
  s.p.slice(4).forEach(p=>p.alive=false); // 2 Hollow, 1 loyal Crew, 1 Martyr: parity.
  s.dawn();assert.equal(s.room.winner,'hollow');assert.equal(s.p[0].score,0);assert.equal(s.p[1].score,1);assert.equal(s.p[2].score,1);
  const crew=scenario(roles);crew.p[1].alive=false;crew.dawn();
  assert.equal(crew.room.winner,'crew');assert.equal(crew.p[0].score,0);assert.equal(crew.p[2].score,1);
});
test('Martyr is non-Hollow in ordinary scans, independent to true-allegiance checks and exact in character checks',()=>{
  for(const [role,expected] of [['xenobiologist',/no Hollow signature/],['thrall',/Independent allegiance/],['thief',/The Martyr/]]) {
    const s=scenario([role,'hollow','martyr',...Array(5).fill('cadet')]);s.use(0,[2]);s.dawn();assert.match(s.texts(0),expected);
  }
});
test('Echo cannot acquire Martyr independent victory',()=>{
  const s=scenario(['echo','hollow','martyr',...Array(5).fill('cadet')]);s.p[2].alive=false;s.use(0,[2]);s.dawn();
  assert.match(s.texts(0),/Nothing happened/);assert.equal(s.p[0].echoPending,undefined);assert.equal(s.p[0].echoSpent,true);
});
test('Medic revival restores the opportunity for a later Martyr execution',()=>{
  const s=scenario(['martyr','hollow','medic',...Array(5).fill('cadet')]);s.hunt(1,0);s.dawn();s.next();s.use(2,[0]);s.dawn();
  assert.equal(s.p[0].alive,true);execute(s);assert.equal(s.room.winner,'martyr');
});
test('daytime blocking expires next dark cycle; rematch clears winner and secret status',()=>{
  const s=scenario(roles);s.dawn();s.p[0].status.abilityBlocked=true;s.next();
  assert.equal(s.p[0].status.abilityBlocked,undefined);s.dawn();execute(s);
  s.command(0,'rematch');assert.equal(s.room.winner,null);assert.equal(s.room.winnerId,null);assert.equal(s.p[0].role,null);assert.deepEqual(s.p[0].status,{});
});
test('Martyr is available in main catalogue and legal scripts, with a single copy and no network',()=>{
  assert.equal(ROLES.martyr.team,'martyr');assert.equal(CARD_LIMITS.martyr,1);assert.equal(canHunt('martyr'),false);
  const pool={cadet:4,hollow:2,xenobiologist:1,warden:1,martyr:1};
  assert.equal(poolError(6,pool,true,3),null);
  assert.match(poolError(6,{...pool,martyr:2,cadet:3},true,3),/valid number/);
  const s=scenario(roles);assert.equal(project(s.room,s.p[0].id).hollow,null);
  // Random selection uses the same main catalogue; no opt-in gate exists.
  assert.ok(Object.hasOwn(randomPool(6), 'martyr'));
});
test('Martyr execution victory takes priority over Hollow parity reached by that same death',()=>{
  const s=scenario(['martyr','hollow','cadet','cadet','cadet','cadet']);
  s.p.slice(3).forEach(p=>p.alive=false);s.dawn();
  assert.equal(s.room.winner,null);execute(s);assert.equal(s.room.winner,'martyr');assert.equal(s.p[1].score,0);
});
test('blocked Martyr execution still allows normal Hollow parity victory',()=>{
  const s=scenario(['martyr','hollow','cadet','cadet','cadet','cadet']);
  s.p.slice(3).forEach(p=>p.alive=false);s.dawn();s.p[0].status.abilityBlocked=true;execute(s);
  assert.equal(s.room.winner,'hollow');assert.equal(s.p[0].score,0);assert.equal(s.p[1].score,1);assert.equal(s.texts(0),'');
});
