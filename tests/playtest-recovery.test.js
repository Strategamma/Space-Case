import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp,mkdir,rmdir } from 'node:fs/promises';
import { act,addPlayer,createRoom,connection,ensureAvatars,project } from '../server/game.js';
import { poolSize,suggestCrewPool } from '../public/setup.js';
import { Peer,boot } from './helpers/transport.js';

test('lobby count follows seats, Captain mode and removal; disconnect and active restoration preserve seats',()=>{
  const room=createRoom('Captain');
  assert.equal(room.settings.playerCount,1);
  for(let n=2;n<=15;n++) {addPlayer(room,'Crew '+n);assert.equal(room.settings.playerCount,n);assert.equal(poolSize(room.settings.roles),Math.max(6,n)+3);}
  act(room,room.host,'settings',{...room.settings,playing:false,playerCount:7});
  assert.equal(room.settings.playerCount,14);
  act(room,room.host,'remove',{id:room.players.at(-1).id});assert.equal(room.settings.playerCount,13);
  connection(room,room.players[1].id,false);assert.equal(room.settings.playerCount,13);
  connection(room,room.players[1].id,true);
  act(room,room.host,'settings',{...room.settings,playerCount:6,roles:suggestCrewPool(13)});
  assert.equal(room.settings.playerCount,13);
  act(room,room.host,'start');
  const saved=structuredClone(room);saved.settings.spareCards=5;ensureAvatars(saved);
  assert.equal(saved.settings.spareCards,5);assert.deepEqual(saved.players,room.players);
});

test('authenticated resume is idempotent, preserves an active seat and transfers control once',async t=>{
  const server=await boot((await mkdtemp(join(tmpdir(),'spacecase-recovery-test-')))+'/rooms.json');
  const peers=Array.from({length:6},()=>new Peer(server.url));
  t.after(async()=>{peers.forEach(p=>p.close());await server.stop();});
  const created=await peers[0].command('create',{name:'Captain'});let pass;
  for(let i=1;i<6;i++){const r=await peers[i].command('join',{code:created.session.code,name:'Crew '+i});if(i===1)pass=r.session;}
  await peers[0].command('start');
  for(const p of peers){await p.wait(s=>s.phase==='orders');await p.command('reveal');await p.command('acknowledge');}
  await peers[1].wait(s=>s.phase==='night');const before=peers[1].state.me;
  assert.equal((await peers[1].command('leave')).retained,true);
  assert.equal((await peers[1].command('join',{code:pass.code,name:'Crew 1'})).ok,false);
  assert.equal((await peers[1].command('resume',pass)).ok,true);
  assert.equal((await peers[1].command('resume',{...pass,code:' '+pass.code.toLowerCase()+' '})).ok,true);
  await peers[1].wait(s=>!s.pause);
  assert.equal(peers[1].state.me.id,before.id);assert.equal(peers[1].state.me.role,before.role);assert.equal(peers[1].state.players.length,6);
  const replacement=new Peer(server.url);peers.push(replacement);
  const moved=new Promise(resolve=>peers[1].once('session-moved',resolve));
  assert.equal((await replacement.command('resume',pass)).ok,true);await moved;
  await replacement.wait(s=>s.me.id===before.id);
  const stranger=new Peer(server.url);peers.push(stranger);
  assert.equal((await stranger.command('resume',{...pass,token:'invalid'})).code,'PASS_INVALID');
  assert.equal((await stranger.command('resume',{...pass,code:'FFFFFF'})).code,'ROOM_NOT_FOUND');
});

test('last lobby Captain can leave and recover; a released lobby berth invalidates only its own pass',async t=>{
  const server=await boot((await mkdtemp(join(tmpdir(),'spacecase-lobby-recovery-')))+'/rooms.json');
  const a=new Peer(server.url),b=new Peer(server.url);
  t.after(async()=>{a.close();b.close();await server.stop();});
  const made=await a.command('create',{name:'Captain'});
  assert.equal((await a.command('leave')).retained,true);
  assert.equal((await a.command('resume',made.session)).ok,true);
  const guest=await b.command('join',{name:'Guest',code:made.session.code});
  assert.equal((await b.command('leave')).retained,false);
  assert.equal((await b.command('resume',guest.session)).code,'PASS_INVALID');
});

test('failed takeover save preserves original connection; retry transfers only after persistence',async t=>{
  const file=join(await mkdtemp(join(tmpdir(),'spacecase-takeover-save-')),'rooms.json');
  const server=await boot(file),a=new Peer(server.url),b=new Peer(server.url);
  t.after(async()=>{a.close();b.close();await server.stop();});
  const made=await a.command('create',{name:'Captain'});await a.wait(s=>s.players.length===1);
  let moved=false;a.on('session-moved',()=>{moved=true;});
  await mkdir(file+'.tmp');
  const failed=await b.command('resume',made.session);
  assert.equal(failed.ok,false);assert.equal(failed.code,'RETRY');assert.equal(moved,false);
  assert.equal((await a.command('reveal')).error,'No sealed character is available.');
  await rmdir(file+'.tmp');
  assert.equal((await a.command('settings',{...a.state.settings})).ok,true);
  const transferred=new Promise(resolve=>a.once('session-moved',resolve));
  assert.equal((await b.command('resume',made.session)).ok,true);await transferred;
  await b.wait(s=>s.me.id===a.state.me.id);assert.equal(moved,true);
});
