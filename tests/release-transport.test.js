import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Peer, boot } from './helpers/transport.js';
import { ROLES, isHollow } from '../public/roles.js';

test('six real clients complete a voyage, score once and rematch without leaking roles or ballots',async t=>{
  const server=await boot(join(await mkdtemp(join(tmpdir(),'spacecase-release-')),'rooms.json'));
  const peers=Array.from({length:6},()=>new Peer(server.url));
  t.after(async()=>{peers.forEach(p=>p.close());await server.stop();});
  const created=await peers[0].command('create',{name:'Captain'});assert.equal(created.ok,true);
  for(let i=1;i<6;i++)assert.equal((await peers[i].command('join',{name:'Crew '+i,code:created.session.code})).ok,true);
  await peers[0].wait(s=>s.players.length===6);
  const roles=Object.fromEntries(Object.keys(ROLES).map(key=>[key,0]));Object.assign(roles,{hollow:1,xenobiologist:1,cadet:7});
  assert.equal((await peers[0].command('settings',{...peers[0].state.settings,roles,night:30})).ok,true);
  assert.equal((await peers[0].command('start')).ok,true);
  for(const p of peers){await p.wait(s=>s.phase==='orders');assert.ok(p.state.players.every(q=>q.role===undefined));await p.command('reveal');await p.wait(s=>s.me.revealed);await p.command('acknowledge');}
  await peers[0].wait(s=>s.phase==='night');
  const evil=peers.find(p=>isHollow(p.state.me.role));assert.ok(evil);
  assert.equal((await evil.command('hunt',{targets:[peers[0].state.me.id]})).ok,false,'first dark cycle cannot kill');
  const investigator=peers.find(p=>p.state.me.role==='xenobiologist');
  if(investigator){assert.equal((await investigator.command('ability',{targets:[evil.state.me.id]})).ok,true);assert.equal(investigator.state.me.reports.length,0);}
  await peers[0].wait(s=>s.phase==='discussion',40_000);
  assert.ok(peers[0].state.players.every(p=>p.alive));
  if(investigator){await investigator.wait(s=>s.me.reports.length>0);assert.match(investigator.state.me.reports[0].text,/Hollow signature/);}
  const before=peers[0].state.deadline;await peers[0].command('extend');await peers[0].wait(s=>s.deadline>before);
  await peers[0].command('nominations');await peers[0].command('nominate',{from:peers[0].state.me.id,to:evil.state.me.id});
  for(const p of peers){await p.wait(s=>s.phase==='voting');assert.equal((await p.command('vote',{execute:true})).ok,true);}
  await peers[0].wait(s=>s.votesCast===6);assert.equal(peers[0].state.votes,undefined);
  for(const p of peers){await p.wait(s=>s.nomination?.result?.yes===6);assert.equal(p.state.nomination.result.outcome,'on-block');assert.equal(p.state.nomination.result.total,6);}
  assert.equal((await peers[0].command('closeVote')).ok,true);await peers[0].wait(s=>s.block===evil.state.me.id);
  assert.equal((await peers[0].command('execute')).ok,true);await peers[0].wait(s=>s.phase==='victory');
  const score=peers[0].state.players.map(p=>p.score);assert.equal(peers[0].state.winner,'crew');
  assert.ok(peers[0].state.players.every(p=>p.score===(isHollow(p.role)?0:1)));
  assert.equal((await peers[0].command('execute')).ok,false);assert.deepEqual(peers[0].state.players.map(p=>p.score),score);
  assert.equal((await peers[0].command('rematch')).ok,true);await peers[0].wait(s=>s.phase==='lobby');
  assert.ok(peers[0].state.players.every(p=>p.role===undefined&&p.alive));assert.deepEqual(peers[0].state.players.map(p=>p.score),score);
});

test('fifteen clients and an overseeing Captain preserve recipient privacy',async t=>{
  const server=await boot(join(await mkdtemp(join(tmpdir(),'spacecase-fifteen-')),'rooms.json'));
  const captain=new Peer(server.url),peers=[captain];t.after(async()=>{peers.forEach(p=>p.close());await server.stop();});
  const created=await captain.command('create',{name:'Overseer'});await captain.wait(s=>s.phase==='lobby');
  const roles=Object.fromEntries(Object.keys(ROLES).map(key=>[key,0]));Object.assign(roles,{hollow:4,xenobiologist:1,cadet:15});
  assert.equal((await captain.command('settings',{...captain.state.settings,playing:false,playerCount:15,spareCards:5,roles})).ok,true);
  for(let i=0;i<15;i++){const p=new Peer(server.url);peers.push(p);assert.equal((await p.command('join',{code:created.session.code,name:'Voyager '+i})).ok,true);}
  const extra=new Peer(server.url);peers.push(extra);assert.equal((await extra.command('join',{code:created.session.code,name:'Extra'})).ok,false);
  assert.equal((await captain.command('start')).ok,true);await captain.wait(s=>s.phase==='orders');
  assert.equal(captain.state.players.filter(p=>p.role).length,15);assert.equal(captain.state.unused.length,5);
  assert.equal((await captain.command('reveal')).ok,false);
  for(const p of peers.slice(1,16)){await p.wait(s=>s.phase==='orders');assert.equal(p.state.unused,undefined);assert.ok(p.state.players.every(q=>q.role===undefined));await p.command('reveal');await p.wait(s=>s.me.revealed);assert.ok(p.state.me.role);assert.equal(JSON.stringify(p.state).includes('token'),false);}
});
