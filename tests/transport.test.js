import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once, EventEmitter } from 'node:events';

// Minimal Engine.IO / Socket.IO test peer; uses Node's built-in WebSocket,
// so transport checks do not need another test dependency or a browser.
class Peer extends EventEmitter {
  constructor(url) {
    super(); this.socket = new WebSocket(url.replace('http','ws') + '/socket.io/?EIO=4&transport=websocket'); this.pending = new Map(); this.sequence = 0;
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Connection timed out')), 5000);
      this.socket.addEventListener('error', reject);
      this.socket.addEventListener('message', event => {
        const message = String(event.data);
        if (message.startsWith('0')) this.socket.send('40');
        else if (message === '2') this.socket.send('3');
        else if (message.startsWith('40')) { clearTimeout(timer); resolve(); }
        else if (message.startsWith('42')) {
          const [name, payload] = JSON.parse(message.slice(2));
          if (name === 'state') { this.state = payload; this.emit('state',payload); }
          else this.emit(name, payload);
        } else if (message.startsWith('43')) {
          const bracket = message.indexOf('['), id = Number(message.slice(2,bracket));
          const finish = this.pending.get(id); if (finish) { this.pending.delete(id); finish(JSON.parse(message.slice(bracket))[0]); }
        }
      });
    });
  }
  async command(action,data={}) {
    await this.ready;
    return new Promise((resolve,reject) => {
      const id=++this.sequence, timer=setTimeout(()=>reject(new Error(`No reply to ${action}`)),5000);
      this.pending.set(id,result=>{clearTimeout(timer);resolve(result);});
      this.socket.send(`42${id}${JSON.stringify(['command',{action,data}])}`);
    });
  }
  async wait(predicate) {
    if (this.state&&predicate(this.state)) return this.state;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.off('state',listener);reject(new Error('State transition timed out'));},5000);
      const listener=state=>{if(predicate(state)){clearTimeout(timer);this.off('state',listener);resolve(state);}};
      this.on('state',listener);
    });
  }
  close(){this.socket.close();}
}
async function boot(file) {
  const child=spawn(process.execPath,['server/index.js'],{cwd:process.cwd(),env:{...process.env,PORT:'0',DATA_FILE:file,DATABASE_URL:''},stdio:['ignore','pipe','pipe']});
  const url=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Server did not start')),5000);
    child.stdout.on('data',data=>{const match=String(data).match(/http:\/\/localhost:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
    child.on('error',reject); child.stderr.on('data',data=>{ if(String(data).includes('Error')) reject(new Error(String(data))); });
  });
  return { url, async stop(){child.kill('SIGTERM');await once(child,'exit');} };
}
test('real six-client voyage: secret roles, authentication, reconnect and restart recovery', async t=>{
  const file=join(await mkdtemp(join(tmpdir(),'spacecase-test-')),'rooms.json');
  let server=await boot(file); const peers=[];
  t.after(async()=>{peers.forEach(p=>p.close());await server.stop();});
  const captain=new Peer(server.url);peers.push(captain);
  const created=await captain.command('create',{name:'Captain'});assert.equal(created.ok,true);await captain.wait(s=>s.players.length===1);
  const chooser = new Peer(server.url), competitor = new Peer(server.url); peers.push(chooser, competitor);
  const available = await chooser.command('inspect', { code: created.session.code });
  assert.deepEqual(available.availability.taken, [0]); assert.equal('players' in available.availability, false);
  const changed = once(chooser, 'availability');
  assert.equal((await competitor.command('join', { name: 'First claimant', code: created.session.code, avatar: 9 })).ok, true);
  assert.ok((await changed)[0].taken.includes(9));
  assert.equal((await chooser.command('join', { name: 'Second claimant', code: created.session.code, avatar: 9 })).ok, false);
  await captain.wait(s=>s.players.length===2);
  await captain.command('remove', { id: captain.state.players.find(p=>p.name==='First claimant').id });
  await captain.wait(s=>s.players.length===1); chooser.close(); competitor.close(); peers.splice(1);
  const sessions=[created.session];
  for(let i=1;i<6;i++){
    const peer=new Peer(server.url);peers.push(peer);
    const joined=await peer.command('join',{name:'Cadet '+i,code:created.session.code});assert.equal(joined.ok,true);sessions.push(joined.session);
  }
  await captain.wait(s=>s.players.length===6);
  assert.equal((await peers[1].command('start')).ok,false);
  assert.equal((await captain.command('start')).ok,true);
  for(const peer of peers){await peer.wait(s=>s.phase==='orders');assert.equal(peer.state.players.every(p=>!p.role),true);assert.equal(peer.state.me.role,null);assert.equal(peer.state.unused,undefined);assert.equal(JSON.stringify(peer.state).includes('token'),false);assert.equal((await peer.command('acknowledge')).ok,false);assert.equal((await peer.command('reveal')).ok,true);await peer.wait(s=>s.me.revealed);assert.ok(peer.state.me.role);assert.equal((await peer.command('acknowledge')).ok,true);}
  await captain.wait(s=>s.phase==='night');
  assert.equal(captain.state.day,1);
  const impostor=new Peer(server.url);await impostor.ready;assert.equal((await impostor.command('resume',{code:created.session.code,token:'wrong'})).ok,false);impostor.close();
  const before=captain.state.me.id;captain.close();await peers[1].wait(s=>s.pause?.reason==='captain');
  const returned=new Peer(server.url);peers.push(returned);assert.equal((await returned.command('resume',sessions[0])).ok,true);await returned.wait(s=>s.me.id===before&&!s.pause);assert.equal(returned.state.host,before);
  const saved=JSON.parse(await readFile(file,'utf8'));assert.equal(saved[0].players.length,6);
  peers.forEach(p=>p.close());await server.stop(); server=await boot(file);
  const restored=[];
  for(const session of sessions){const p=new Peer(server.url);peers.push(p);restored.push(p);assert.equal((await p.command('resume',session)).ok,true);}
  await restored[0].wait(s=>!s.pause&&s.players.every(p=>p.online));assert.equal(restored[0].state.me.id,before);assert.equal(restored[0].state.phase,'night');
  assert.equal(restored[0].state.me.role,returned.state.me.role);
  assert.deepEqual(restored[0].state.players.map(p=>p.avatar), saved[0].players.map(p=>p.avatar));
  const health=await fetch(server.url+'/health');assert.equal(health.ok,true);
  const manifest=await (await fetch(server.url+'/manifest.webmanifest')).json();
  for(const icon of manifest.icons)assert.equal((await fetch(server.url+icon.src)).ok,true);
  const sw=await (await fetch(server.url+'/sw.js')).text();
  const shell=JSON.parse(sw.match(/const SHELL = (\[[^;]+\]);/)[1].replaceAll("'",'"'));
  for(const path of shell)assert.equal((await fetch(server.url+path)).ok,true,`PWA shell resource ${path}`);
  assert.match((await fetch(server.url+'/assets/space-grotesk-regular.ttf')).headers.get('content-type'),/font/);
});
