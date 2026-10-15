import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { boot, Peer } from './helpers/transport.js';

test('production refuses an ephemeral store without DATABASE_URL',()=>{
  const result=spawnSync(process.execPath,['server/index.js'],{env:{...process.env,NODE_ENV:'production',DATABASE_URL:''},encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/DATABASE_URL is required in production/);
});
test('release serves complete versioned PWA module graph and rejects cross-origin joins',async t=>{
  const server=await boot(join(await mkdtemp(join(tmpdir(),'spacecase-http-')),'rooms.json'));t.after(()=>server.stop());
  const health=await fetch(server.url+'/health?probe=release');assert.equal(health.status,200);assert.equal(health.headers.get('cache-control'),'no-store');
  assert.equal((await fetch(server.url+'/health',{method:'POST'})).status,405);
  assert.equal((await fetch(server.url+'/socket.io/?EIO=4&transport=polling',{headers:{Origin:'https://untrusted.example'}})).status,403);
  assert.equal((await fetch(server.url+'/%2e%2e%2fpackage.json')).status,404);
  const index=await (await fetch(server.url)).text();const sw=await (await fetch(server.url+'/sw.js')).text();
  const shell=JSON.parse(sw.match(/const SHELL = (\[[^;]+\]);/)[1].replaceAll("'",'"'));
  const queue=[...index.matchAll(/(?:src|href)="([^\"]+\.(?:js|css)(?:\?[^\"]*)?)"/g)].map(m=>m[1]);
  const visited=new Set();while(queue.length){const path=queue.pop();if(visited.has(path))continue;visited.add(path);
    assert.ok(shell.includes(path),`uncached app dependency ${path}`);const response=await fetch(server.url+path);assert.equal(response.status,200,path);
    if(!path.startsWith('/socket.io/'))assert.equal(response.headers.get('x-content-type-options'),'nosniff');const source=await response.text();
    if(path.split('?')[0].endsWith('.js')&&!path.startsWith('/socket.io/')) for(const [,dependency]of source.matchAll(/from\s+['"]([^'"]+)['"]/g)){
      const url=new URL(dependency,server.url+path);queue.push(url.pathname+url.search);
    }
  }
});

test('a failed snapshot is rejected privately and rolled back before clients see a join',async t=>{
  const file=join(await mkdtemp(join(tmpdir(),'spacecase-save-failure-')),'rooms.json'),server=await boot(file);
  const captain=new Peer(server.url),joiner=new Peer(server.url);t.after(async()=>{captain.close();joiner.close();await server.stop();});
  const created=await captain.command('create',{name:'Captain'});assert.equal(created.ok,true);await captain.wait(s=>s.players.length===1);
  await mkdir(file+'.tmp');const failed=await joiner.command('join',{code:created.session.code,name:'Voyager'});
  assert.equal(failed.ok,false);assert.match(failed.error,/could not save/);assert.equal(failed.error.includes(file),false);
  assert.equal(captain.state.players.length,1);await rmdir(file+'.tmp');
  assert.equal((await joiner.command('join',{code:created.session.code,name:'Voyager'})).ok,true);await captain.wait(s=>s.players.length===2);
});
