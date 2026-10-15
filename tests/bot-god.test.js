import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLES,canHunt,isHollow} from '../public/roles.js';
import {NIGHT_ORDER,NIGHT_STAGES,scriptOrder,resolutionRank} from '../public/script.js';
import {poolError,suggestPool,poolSize,allowedDeal} from '../public/setup.js';
import {dealPool,startingReports,deliverReports} from '../server/moderator.js';
import {createRoom,addPlayer,act,connection,project,ensureAvatars} from '../server/game.js';

test('every character has a valid first/later night reference with required dependencies',()=>{
  assert.deepEqual(Object.keys(NIGHT_ORDER).sort(),Object.keys(ROLES).sort());
  const ids=new Set(NIGHT_STAGES.map(s=>s.id));
  for(const data of Object.values(NIGHT_ORDER))for(const when of ['first','other'])for(const id of data[when])assert.ok(ids.has(id));
  for(const first of [true,false]) {
    assert.ok(resolutionRank('jammer',first)<resolutionRank('xenobiologist',first));
    assert.ok(resolutionRank('forger',first)<resolutionRank('xenobiologist',first));
  }
  assert.ok(resolutionRank('breachborn')<resolutionRank('medic'));
  assert.ok(resolutionRank('medic')<resolutionRank('proximity'));
  assert.ok(resolutionRank('proximity')<resolutionRank('parasite'));
  assert.equal(NIGHT_ORDER.breachborn.first.includes('attack'),false);
  assert.equal(NIGHT_ORDER.medic.first.includes('revival'),false);
});
test('public Script shows possible cards only, regardless of actual assignment or unused choices',()=>{
  const roles={cadet:4,hollow:2,jammer:1,xenobiologist:1,warden:1};
  const first=scriptOrder(roles,true), later=scriptOrder(roles,false);
  const shown=new Set([...first,...later].flatMap(s=>s.cards));
  assert.deepEqual([...shown].sort(),Object.keys(roles).sort());
  assert.ok(first.find(s=>s.id==='briefing').cards.includes('jammer'));
  assert.ok(!first.some(s=>s.id==='attack'));assert.ok(later.some(s=>s.id==='attack'));
  assert.ok(!JSON.stringify(first).includes('recipient'));
});
test('suggestions and secret 3/4/5-card deals remain valid across all supported group sizes',()=>{
  for(let n=6;n<=15;n++)for(const spare of [3,4,5]) {
    const roles=suggestPool(n,spare);assert.equal(poolSize(roles),n+spare);
    assert.equal(poolError(n,roles,false,spare),null,`${n}+${spare}`);
    for(const choose of [()=>0,size=>size-1]){
      const d=dealPool(n,roles,choose,spare);assert.equal(d.assigned.length,n);assert.equal(d.unused.length,spare);
      assert.equal(allowedDeal(d.assigned),true);assert.ok(d.assigned.some(canHunt));assert.ok(d.assigned.filter(isHollow).length<=Math.floor(n/3));
      const count=cards=>cards.reduce((out,key)=>({...out,[key]:(out[key]||0)+1}),{});
      assert.deepEqual(count([...d.assigned,...d.unused]),count(Object.entries(roles).flatMap(([key,m])=>Array(m).fill(key))));
    }
  }
});
test('spare-card configuration is validated and retained across settings, deal and restoration',()=>{
  const room=createRoom('Captain');for(let i=1;i<6;i++)addPlayer(room,'Crew '+i);
  assert.throws(()=>act(room,room.host,'settings',{...room.settings,spareCards:2}),/3, 4 or 5/);
  const roles=suggestPool(6,5);act(room,room.host,'settings',{...room.settings,roles,spareCards:5});
  act(room,room.host,'start');assert.equal(room.unused.length,5);
  assert.equal(project(room,room.host).unused,undefined);
  assert.equal(project(room,room.host).settings.spareCards,5);
  const restored=JSON.parse(JSON.stringify(room));ensureAvatars(restored);assert.equal(restored.settings.spareCards,5);
  delete restored.settings.spareCards;ensureAvatars(restored);assert.equal(restored.settings.spareCards,3);
});
test('last private acknowledgement starts night one exactly once; disconnected seats prevent automatic start',()=>{
  const room=createRoom('Captain');for(let i=1;i<6;i++)addPlayer(room,'Crew '+i);
  act(room,room.host,'start');const last=room.players.at(-1), absent=room.players[1];
  for(const p of room.players){act(room,p.id,'reveal');if(p!==last)act(room,p.id,'acknowledge');}
  assert.equal(room.phase,'orders');connection(room,absent.id,false);
  act(room,last.id,'acknowledge');assert.equal(room.phase,'orders');
  connection(room,absent.id,true);assert.equal(room.phase,'night');assert.equal(room.day,1);
  assert.throws(()=>act(room,last.id,'acknowledge'),/phase/);assert.equal(room.day,1);
});

test('Oracle receives configured unused-card count privately and first night auto-starts for an overseeing Captain',()=>{
  const room=createRoom('Captain');for(let i=1;i<7;i++)addPlayer(room,'Crew '+i);
  const roles=suggestPool(6,4);roles.cadet--;roles.oracle=1;
  act(room,room.host,'settings',{...room.settings,playing:false,spareCards:4,roles});act(room,room.host,'start');
  const owner=room.players.find(p=>p.playing);owner.role='oracle';
  // A deliberate reveal gates the private report even when the card was forced in this scenario.
  owner.reports=[];owner.reportKeys=[];deliverReports(room,startingReports(room));
  assert.deepEqual(project(room,owner.id).me.reports,[]);
  for(const p of room.players.filter(p=>p.playing)){act(room,p.id,'reveal');act(room,p.id,'acknowledge');}
  assert.equal(room.phase,'night');assert.equal(room.day,1);assert.equal(room.unused.length,4);
  assert.equal(project(room,owner.id).me.reports.find(r=>r.kind==='unused').text.split(', ').length,4);
});
