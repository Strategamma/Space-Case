import test from 'node:test';
import assert from 'node:assert/strict';
import { scenario } from './helpers/character-scenario.js';
import { act, project, ensureAvatars, connection } from '../server/game.js';

function setup() {
  const s=scenario(['cadet','hollow','cadet','cadet','cadet','cadet'],1);s.dawn();s.command(0,'nominations');return s;
}
function nominate(s,from,to,yes) {
  s.command(0,'nominate',{from:s.p[from].id,to:s.p[to].id});
  s.p.forEach((p,i)=>s.command(i,'vote',{execute:i<yes}));
  return s.room.nomination.result;
}
test('final eligible vote reveals each ballot only after everyone has chosen',()=>{
  const s=setup();s.command(0,'nominate',{from:s.p[2].id,to:s.p[3].id});
  for(let i=0;i<5;i++)s.command(i,'vote',{execute:i<3});
  for(const p of s.p) {const view=project(s.room,p.id);assert.equal(view.nomination.result,undefined);assert.equal(view.votes,undefined);assert.equal(view.voters.length,6);assert.equal(view.voters.filter(v=>v.voted).length,5);assert.ok(view.voters.every(v=>!Object.hasOwn(v,'execute')));assert.equal(view.nominations.length,0);}
  s.command(5,'vote',{execute:false});
  assert.equal(s.room.phase,'voting');
  for(const p of s.p) {
    const view=project(s.room,p.id),r=view.nomination.result;
    assert.deepEqual(r,{yes:3,spare:3,total:6,threshold:3,outcome:'on-block',block:s.p[3].id,high:3,tied:false,ballots:s.p.map((p,i)=>({id:p.id,execute:i<3}))});
    assert.equal(view.votes,undefined);assert.equal(view.nomination.from,s.p[2].id);assert.equal(view.nomination.to,s.p[3].id);
  }
  assert.equal(s.p[3].alive,true);assert.equal(s.room.nominations.length,1);
  assert.throws(()=>s.command(5,'vote',{execute:true}),/already sealed/);
});
test('advancing and restoring a completed ballot never counts it twice or creates a false tie',()=>{
  const s=setup();nominate(s,0,1,4);
  const restored=JSON.parse(JSON.stringify(s.room));ensureAvatars(restored);
  act(restored,restored.host,'closeVote');
  assert.equal(restored.phase,'nominations');assert.equal(restored.nominations.length,1);
  assert.equal(restored.block,s.p[1].id);assert.equal(restored.high,4);assert.equal(restored.tied,false);
  assert.equal(restored.nominations[0].result.yes,4);
});
test('automatic results distinguish below minimum, lower totals, ties and a new highest total',()=>{
  const s=setup();assert.equal(nominate(s,0,1,4).outcome,'on-block');s.command(0,'closeVote');
  let r=nominate(s,1,2,3);assert.equal(r.outcome,'lower-total');assert.equal(r.block,s.p[1].id);s.command(0,'closeVote');
  r=nominate(s,2,3,2);assert.equal(r.outcome,'below-threshold');assert.equal(r.block,s.p[1].id);s.command(0,'closeVote');
  r=nominate(s,3,4,4);assert.equal(r.outcome,'tied');assert.equal(r.block,null);s.command(0,'closeVote');
  r=nominate(s,4,5,5);assert.equal(r.outcome,'on-block');assert.equal(r.block,s.p[5].id);assert.equal(r.high,5);
});
test('automatic tally uses the frozen eligible denominator and supports old untallied completed snapshots',()=>{
  const s=setup();s.p[5].status.noVote=true;
  s.command(0,'nominate',{from:s.p[0].id,to:s.p[1].id});
  for(let i=0;i<5;i++)s.command(i,'vote',{execute:i<3});
  assert.equal(s.room.nomination.result.total,5);assert.equal(s.room.nomination.result.threshold,3);
  const legacy=setup();legacy.command(0,'nominate',{from:legacy.p[0].id,to:legacy.p[1].id});
  legacy.room.votes=Object.fromEntries(legacy.p.map(p=>[p.id,true]));
  legacy.command(0,'closeVote');assert.equal(legacy.room.nominations[0].yes,6);assert.equal(legacy.room.block,legacy.p[1].id);
});

test('participation and reveal use the frozen eligible roster, excluding suspended voters and an overseer',()=>{
  const s=setup();s.p[5].status.noVote=true;
  s.command(0,'nominate',{from:s.p[0].id,to:s.p[1].id});
  s.command(0,'vote',{execute:true});
  const view=project(s.room,s.p[2].id);assert.equal(view.voters.length,5);assert.equal(view.voters.some(v=>v.id===s.p[5].id),false);
  assert.deepEqual(view.voters.find(v=>v.id===s.p[0].id),{id:s.p[0].id,voted:true});assert.equal(view.nomination.result,undefined);
  for(let i=1;i<5;i++)s.command(i,'vote',{execute:false});
  assert.equal(project(s.room,s.p[5].id).nomination.result.ballots.length,5);
  s.command(0,'closeVote');assert.equal(project(s.room,s.p[4].id).nominations[0].result.ballots.length,5);
});

test('voting elapsed clock excludes a disconnect pause and freezes once all ballots arrive',()=>{
  const s=setup();const now=100000;
  act(s.room,s.room.host,'nominate',{from:s.p[0].id,to:s.p[1].id},now);
  connection(s.room,s.p[2].id,false,now+5000);
  assert.equal(s.room.nomination.pausedAt,now+5000);
  connection(s.room,s.p[2].id,true,now+20000);
  assert.equal(s.room.nomination.pausedMs,15000);assert.equal(s.room.nomination.pausedAt,undefined);
  for(const p of s.p)act(s.room,p.id,'vote',{execute:false},now+25000);
  assert.equal(s.room.nomination.completedAt-now-s.room.nomination.pausedMs,10000);
  connection(s.room,s.p[2].id,false,now+26000);connection(s.room,s.p[2].id,true,now+40000);
  assert.equal(s.room.nomination.pausedMs,15000);
  const restored=structuredClone(s.room);ensureAvatars(restored);
  assert.deepEqual(project(restored,s.p[0].id).nomination.result.ballots,s.room.nomination.result.ballots);
});

test('before completion another voter cannot distinguish Execute from Spare anywhere in their projection',()=>{
  const s=setup();s.command(0,'nominate',{from:s.p[0].id,to:s.p[1].id});s.command(0,'vote',{execute:true});
  const yes=project(s.room,s.p[2].id);s.room.votes[s.p[0].id]=false;const spare=project(s.room,s.p[2].id);
  yes.serverNow=0;spare.serverNow=0;assert.deepEqual(yes,spare);
});
