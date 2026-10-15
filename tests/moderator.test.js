import test from 'node:test';
import assert from 'node:assert/strict';
import { dealPool, dealWeight, startingReports, nightReports, deliverReports } from '../server/moderator.js';
import { factionLimits, poolError, candidateDeals, allowedDeal } from '../public/setup.js';
import { DEFAULT_SETTINGS } from '../public/roles.js';
import { createRoom, addPlayer, act, project } from '../server/game.js';

const pool = (count, evil) => ({ ...Object.fromEntries(Object.keys(DEFAULT_SETTINGS.roles).map(key=>[key,0])), cadet: count + 3 - evil, hollow: evil });
const counts = cards => cards.reduce((all,role)=>{all[role]=(all[role]||0)+1;return all;},{});
test('all supported sizes and extra-evil pools deal N cards, hide three, and retain valid factions', () => {
  for(let n=6;n<=15;n++) for(let evil=1;evil<=factionLimits(n).maxEvil+3;evil++) {
    const roles=pool(n,evil); assert.equal(poolError(n,roles),null);
    for(const choose of [()=>0,size=>size-1]) {
      const dealt=dealPool(n,roles,choose), h=dealt.assigned.filter(r=>r==='hollow').length;
      assert.equal(dealt.assigned.length,n);assert.equal(dealt.unused.length,3);
      assert.ok(h>=1&&h<=factionLimits(n).maxEvil);assert.ok(n-h>=factionLimits(n).minGood);
      assert.deepEqual(counts([...dealt.assigned,...dealt.unused]),{cadet:roles.cadet,hollow:roles.hollow});
    }
  }
});
test('extra Hollow really can be dealt or unused; actual team size is not forced',()=>{
  const roles=pool(6,2);
  assert.equal(dealPool(6,roles,()=>0).assigned.filter(r=>r==='hollow').length,2);
  const other=dealPool(6,roles,n=>n-1);assert.equal(other.assigned.filter(r=>r==='hollow').length,1);assert.ok(other.unused.includes('hollow'));
});
test('invalid size, missing enemy, insufficient good, and unknown cards cannot be dealt',()=>{
  assert.throws(()=>dealPool(6,{...pool(6,1),cadet:7}),/exactly 9/);
  assert.throws(()=>dealPool(6,pool(6,0)),/Hollow/);
  assert.throws(()=>dealPool(6,pool(6,6)),/loyal Crew/);
  assert.throws(()=>dealPool(6,{...pool(6,1),invented:0}),/library/);
});
test('playing Captain gets neither unused cards nor actual role/faction counts; reveal is deliberate',()=>{
  const room=createRoom('Captain');for(let i=1;i<6;i++)addPlayer(room,'Crew '+i);
  act(room,room.host,'start');let view=project(room,room.host);
  assert.equal(view.me.role,null);assert.deepEqual(view.me.reports,[]);assert.equal(view.hollow,null);assert.equal('unused' in JSON.parse(JSON.stringify(view)),false);
  assert.ok(view.players.every(p=>p.role===undefined));assert.equal(Object.values(view.settings.roles).reduce((a,b)=>a+b,0),9);
  assert.throws(()=>act(room,room.host,'acknowledge'),/Open your sealed/);
  act(room,room.host,'reveal');view=project(room,room.host);assert.equal(view.me.role,room.players[0].role);assert.equal(view.unused,undefined);
  assert.deepEqual(view.me.reports,room.players[0].reports);
  for(const p of room.players.filter(p=>p.id!==room.host)){const other=project(room,p.id);assert.equal(other.me.role,null);assert.deepEqual(other.me.reports,[]);assert.equal(other.hollow,null);}
});
function scenario(roles) {
  const room=createRoom('Crew 0'); for(let i=1;i<roles.length;i++)addPlayer(room,'Crew '+i);
  room.players.forEach((p,i)=>{p.role=roles[i];p.revealed=true;});room.day=1;room.phase='night';return room;
}
test('starting briefings route only to entitled people and explicitly handle undealt specialists',()=>{
  const room=scenario(['hollow','hollow','engineer','observer','cadet','cadet']);
  deliverReports(room,startingReports(room));
  assert.match(room.players[0].reports[0].text,/Crew 0, Crew 1/);
  assert.deepEqual(room.players[2].reports,[]);
  assert.match(room.players[3].reports[0].text,/No Xenobiologist/);
  assert.deepEqual(room.players[4].reports,[]);assert.deepEqual(room.players[5].reports,[]);
  assert.ok(room.players[2].reports.every(r=>!r.text.includes('Hollow crew:')));
  const paired=scenario(['engineer','engineer','xenobiologist','observer','hollow','cadet']);deliverReports(paired,startingReports(paired));
  assert.deepEqual(paired.players[0].reports,[]);assert.deepEqual(paired.players[1].reports,[]);assert.match(paired.players[3].reports[0].text,/Crew 2/);
});
test('scan, analysis and beacon messages are independent, recipient-specific and idempotent',()=>{
  const room=scenario(['xenobiologist','analyst','beacon','cadet','hollow','cadet']);const p=room.players;
  room.nightChoices={[p[0].id]:[p[4].id],[p[1].id]:[p[4].id,p[5].id],[p[2].id]:[p[3].id]};
  const notes=nightReports(room);deliverReports(room,notes);deliverReports(room,notes);
  assert.equal(p[0].reports.length,1);assert.equal(p[1].reports.length,1);assert.equal(p[3].reports.length,1);
  assert.match(p[0].reports[0].text,/Crew 4: Hollow signature/);assert.match(p[1].reports[0].text,/at least one/);assert.match(p[3].reports[0].text,/Crew 2 is the Beacon/);
  assert.deepEqual(p[2].reports,[]);assert.deepEqual(p[4].reports,[]);assert.deepEqual(p[5].reports,[]);
  assert.ok(room.log.every(note=>!note.text.includes('signature')));
});
test('a dead recipient receives no queued private report',()=>{
  const room=scenario(['xenobiologist','hollow','cadet','cadet','cadet','cadet']), p=room.players;
  room.nightChoices={[p[0].id]:[p[1].id]};const notes=nightReports(room);p[0].alive=false;deliverReports(room,notes);assert.deepEqual(p[0].reports,[]);
});
test('launch requires the configured number of playing crew, excluding an overseeing Captain',()=>{
  const room=createRoom('Captain');for(let i=1;i<7;i++)addPlayer(room,'Crew '+i);
  assert.throws(()=>act(room,room.host,'start'),/expects 6/);
  act(room,room.host,'settings',{...room.settings,playing:false});act(room,room.host,'start');assert.equal(room.players.filter(p=>p.role).length,6);assert.equal(room.unused.length,3);
  assert.equal(project(room,room.host).unused.length,3);
});

test('strength weighting prefers more Hollow against richer information, without excluding legal deals',()=>{
  const weak = ['hollow','cadet','cadet','cadet','cadet','cadet'];
  const rich = ['hollow','xenobiologist','analyst','engineer','engineer','observer'];
  assert.ok(dealWeight(weak) > dealWeight(['hollow','hollow','cadet','cadet','cadet','cadet']));
  assert.ok(dealWeight(rich) < dealWeight(['hollow','hollow','xenobiologist','analyst','engineer','engineer']));
  assert.ok(dealWeight(['hollow','observer','assistant','cadet','cadet','cadet'])<dealWeight(weak));
  assert.ok(dealWeight(rich)>0);
});

test('Engineer candidate pairs allow zero, one or two actual assignments at every supported size',()=>{
  for(let n=6;n<=15;n++) {
    const roles={...pool(n,2),engineer:2,cadet:n-1};
    assert.equal(poolError(n,roles),null);
    const deals=candidateDeals(n,roles).deals;
    const counts=new Set(deals.map(d=>d.assigned.filter(key=>key==='engineer').length));
    assert.deepEqual([...counts].sort(),[0,1,2]);
    assert.match(poolError(n,{...roles,engineer:1,cadet:n}),/zero or at least two/);
  }
});
test('a legal singleton Engineer gets no automatic partner or absence information',()=>{
  const cards=['engineer','hollow','cadet','cadet','cadet','cadet'];
  assert.equal(allowedDeal(cards),true);
  const room=scenario(cards);deliverReports(room,startingReports(room));
  assert.deepEqual(room.players[0].reports,[]);
  assert.ok(room.players.slice(1).every(p=>p.reports.every(r=>!r.text.includes('only Engineer'))));
});
