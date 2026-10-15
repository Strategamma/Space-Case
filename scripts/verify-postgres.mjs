import assert from 'node:assert/strict';
import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { openStore } from '../server/store.js';
import { createRoom, addPlayer } from '../server/game.js';
import { Peer, boot } from '../tests/helpers/transport.js';

assert.ok(process.env.TEST_DATABASE_URL,'Set TEST_DATABASE_URL to a dedicated test database. Never use the production database.');
assert.match(new URL(process.env.TEST_DATABASE_URL).pathname,/(?:^|[_/-])test(?:$|[_-])/,'The database name must contain a separate test segment.');
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.NODE_ENV='production';
const db=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,max:2});
const room=createRoom('Postgres release check');room.code=randomBytes(3).toString('hex').toUpperCase();room.updatedAt=Date.now();
const idle=createRoom('Untouched room');idle.updatedAt=Date.now();
let store,server;const peers=[];
try{
  store=await openStore();await store.save(new Map([[room.code,room],[idle.code,idle]]));
  const idleBefore=(await db.query('SELECT updated_at FROM space_case_rooms WHERE code=$1',[idle.code])).rows[0].updated_at;
  addPlayer(room,'Persistent voyager');room.updatedAt=Date.now();await store.save(new Map([[room.code,room],[idle.code,idle]]),room.code);
  assert.equal((await db.query('SELECT updated_at FROM space_case_rooms WHERE code=$1',[idle.code])).rows[0].updated_at.getTime(),idleBefore.getTime(),'saving a room must not refresh an unrelated room');
  assert.equal(await store.healthy(),true);await store.close();store=null;
  server=await boot('',{NODE_ENV:'production',DATABASE_URL:process.env.TEST_DATABASE_URL});
  let captain=new Peer(server.url);peers.push(captain);assert.equal((await captain.command('resume',{code:room.code,token:room.players[0].token})).ok,true);
  await captain.wait(s=>s.players.length===2);assert.equal(captain.state.players[1].name,'Persistent voyager');
  assert.equal((await fetch(server.url+'/health')).status,200);
  captain.close();await server.stop();server=null;
  server=await boot('',{NODE_ENV:'production',DATABASE_URL:process.env.TEST_DATABASE_URL});captain=new Peer(server.url);peers.push(captain);
  assert.equal((await captain.command('resume',{code:room.code,token:room.players[0].token})).ok,true);await captain.wait(s=>s.players.length===2);
  assert.equal(captain.state.me.id,room.players[0].id);console.log('PostgreSQL snapshots, isolated room updates, health and production server restart verified.');
}finally{
  peers.forEach(p=>p.close());if(server)await server.stop();if(store)await store.close();
  await db.query('DELETE FROM space_case_rooms WHERE code=ANY($1)',[[room.code,idle.code]]);await db.end();
}
