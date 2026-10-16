import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, isHollow, canHunt } from '../public/roles.js';
import { crewPoolError, suggestCrewPool, randomCrewPool, allowedDeal, poolSize, CARD_LIMITS } from '../public/setup.js';
import { dealAutomaticHollow, startingReports, deliverReports } from '../server/moderator.js';
import { createRoom, addPlayer, act, ensureAvatars, project } from '../server/game.js';
const seeded=seed=>size=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*size);};
const multiset=cards=>cards.reduce((out,key)=>({...out,[key]:(out[key]||0)+1}),{});

test('automatic Hollow deals preserve legal faction limits and candidate conservation for every supported size',()=>{
  for(let n=6;n<=15;n++)for(const spare of [3,4,5])for(const reveal of [true,false]) {
    const pool=randomCrewPool(n,spare,reveal,seeded(n*31+spare+(reveal?1000:0)));
    assert.equal(poolSize(pool),n+spare);assert.equal(crewPoolError(n,pool,reveal,spare),null);
    assert.ok(Object.entries(pool).every(([id,count])=>!isHollow(id)||count===0));
    for(const choose of [()=>0,size=>size-1,seeded(n*47+spare)]) {
      const deal=dealAutomaticHollow(n,pool,choose,spare),h=deal.assigned.filter(isHollow).length;
      assert.equal(deal.assigned.length,n);assert.ok(h>=1&&h<=Math.floor(n/3));assert.ok(deal.assigned.some(canHunt));assert.ok(allowedDeal(deal.assigned));
      assert.equal(deal.unused.length,spare+h);assert.ok(deal.unused.every(id=>!isHollow(id)));
      assert.deepEqual(multiset([...deal.assigned.filter(id=>!isHollow(id)),...deal.unused]),multiset(Object.entries(pool).flatMap(([id,count])=>Array(count).fill(id))));
      for(const id of Object.keys(ROLES))assert.ok(deal.assigned.filter(key=>key===id).length<=CARD_LIMITS[id]);
    }
  }
});
test('Captain cannot submit Hollow cards or disable automatic selection through forged settings',()=>{
  const room=createRoom('Captain');
  assert.equal(room.settings.automaticHollow,true);assert.equal(crewPoolError(6,room.settings.roles,true,3),null);
  act(room,room.host,'settings',{...room.settings,automaticHollow:false});assert.equal(room.settings.automaticHollow,true);
  for(const id of Object.keys(ROLES).filter(isHollow)) {
    const roles={...room.settings.roles,cadet:room.settings.roles.cadet-1,[id]:1};
    assert.throws(()=>act(room,room.host,'settings',{...room.settings,roles,automaticHollow:false}),/Ship Intelligence chooses Hollow/);
  }
});
test('new launch publishes only authored candidates, preserves Oracle information and hides unused cards from ordinary players',()=>{
  const room=createRoom('Captain');while(room.players.length<8)addPlayer(room,'Crew '+room.players.length);
  const roles=suggestCrewPool(8,3);act(room,room.host,'settings',{...room.settings,playerCount:8,roles});act(room,room.host,'start');
  const h=room.players.filter(p=>isHollow(p.role)).length;
  assert.equal(room.unused.length,3+h);
  for(const p of room.players) {
    const view=project(room,p.id);assert.equal(view.unused,undefined);assert.equal(view.hollow,null);
    assert.deepEqual(view.settings.roles,roles);assert.ok(view.players.every(p=>p.role===undefined));
  }
  // Explicit Oracle entitlement fixture, independent of the engine's random enemy selection.
  const owner=room.players[0];owner.role='oracle';owner.revealed=true;owner.reports=[];owner.reportKeys=[];
  deliverReports(room,startingReports(room));
  const text=project(room,owner.id).me.reports.find(r=>r.kind==='unused').text;
  for(const id of room.unused)assert.ok(text.includes(ROLES[id].name));
  assert.equal(text.slice('Unused cards: '.length,-1).split(', ').length,room.unused.length);
  assert.equal(project(room,room.players[1].id).unused,undefined);
});
test('older active matches retain their deal while old lobbies and rematches adopt automatic Hollow setup',()=>{
  const room=createRoom('Captain');while(room.players.length<6)addPlayer(room,'Crew '+room.players.length);
  room.settings.roles={...room.settings.roles,cadet:5,hollow:2};delete room.settings.automaticHollow;
  room.phase='night';room.players.forEach((p,i)=>p.role=i?'cadet':'hollow');
  const before=room.players.map(p=>p.role);ensureAvatars(room);
  assert.equal(room.settings.automaticHollow,undefined);assert.deepEqual(room.players.map(p=>p.role),before);assert.equal(room.settings.roles.hollow,2);
  room.phase='victory';act(room,room.host,'rematch');assert.equal(room.settings.automaticHollow,true);assert.equal(room.settings.roles.hollow,0);assert.equal(poolSize(room.settings.roles),9);
  const lobby=createRoom('Legacy lobby');delete lobby.settings.automaticHollow;lobby.settings.roles={...lobby.settings.roles,cadet:5,hollow:2};ensureAvatars(lobby);
  assert.equal(lobby.settings.automaticHollow,true);assert.equal(lobby.settings.roles.hollow,0);assert.equal(crewPoolError(6,lobby.settings.roles,true),null);
});
test('crew-only setup still validates Engineer pairs, dependencies, reveal compatibility and unknown cards',()=>{
  const roles=suggestCrewPool(6);
  assert.match(crewPoolError(6,{...roles,cadet:6,engineer:1}),/zero or at least two/);
  assert.match(crewPoolError(6,{...roles,xenobiologist:0,observer:1}),/possible Xenobiologist/);
  assert.match(crewPoolError(6,{...roles,cadet:6,assistant:1},true),/reveals/);
  assert.match(crewPoolError(6,{...roles,unknown:0}),/library/);
});
