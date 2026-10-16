import test from 'node:test';
import assert from 'node:assert/strict';
import { act, addPlayer, adjacent, connection, createRoom, ensureAvatars, project, tick } from '../server/game.js';
import { deliverReports, startingReports } from '../server/moderator.js';
import { ROLES } from '../public/roles.js';

function fixture(count = 6, hollow = 1) {
  const room = createRoom('Captain');
  for (let i = 1; i < count; i++) addPlayer(room, `Cadet ${i}`);
  // Legacy fixed-deal fixture for established ability rules, not a host settings path.
  room.settings.playerCount = count;
  room.settings.roles.cadet = count + 3 - Object.entries(room.settings.roles).filter(([key])=>key!=='cadet').reduce((a,[,n])=>a+n,0);
  let now = 1_000_000;
  const command = (id, action, data = {}) => {
    if (action === 'start') {
      room.settings.automaticHollow=false;room.settings.roles.hollow=hollow;
      const seats = room.players.filter(p=>p.playing);
      room.settings.playerCount = seats.length;
      room.settings.roles.cadet = seats.length + 3 - Object.entries(room.settings.roles).filter(([key])=>key!=='cadet').reduce((a,[,n])=>a+n,0);
      act(room,id,action,data,now);
      // Ability scenarios fix roles after a real deal. Random pool selection is
      // exercised independently in moderator.test.js and the transport test.
      const roles = Object.entries(room.settings.roles).filter(([key])=>key!=='cadet').flatMap(([key,n])=>Array(n).fill(key));
      seats.forEach((p,i)=>{p.role=roles[i]||'cadet';p.reports=[];p.reportKeys=[];});
      room.unused=['cadet','cadet','cadet']; deliverReports(room,startingReports(room));
      return;
    }
    act(room,id,action,data,now);
  };
  const advance = ms => { now += ms; return tick(room, now); };
  const start = () => { command(room.host, 'start'); room.players.filter(p=>p.playing).forEach(p => { command(p.id,'reveal'); command(p.id, 'acknowledge'); }); if(room.phase==='orders')command(room.host, 'night'); };
  return { room, command, advance, start };
}
test('avatars are selected, exclusive per room, validated, and independent of seat order', () => {
  const room = createRoom('Captain', 12);
  const guest = addPlayer(room, 'Nova', true, 3);
  assert.equal(room.players[0].avatar, 12); assert.equal(project(room, guest.id).players[1].avatar, 3);
  assert.throws(() => addPlayer(room, 'Duplicate', true, 3), /just claimed/);
  for (const value of [-1, 16, 1.5, '3', null]) assert.throws(() => addPlayer(room, 'Invalid', true, value), /valid crew avatar/);
  assert.equal(createRoom('Other ship', 3).players[0].avatar, 3);
  act(room, room.host, 'remove', { id: guest.id }); assert.equal(addPlayer(room, 'Replacement', true, 3).avatar, 3);
});
test('sixteen unique avatars cover fifteen crew and a non-playing Captain', () => {
  const room = createRoom('Captain', 15); act(room, room.host, 'settings', { ...room.settings, playing: false });
  for (let i = 0; i < 15; i++) addPlayer(room, 'Cadet ' + i, true, i);
  assert.equal(new Set(room.players.map(p => p.avatar)).size, 16);
});
test('avatar identity survives night, death, rematch and legacy snapshot migration', () => {
  const f = fixture(); const before = f.room.players.map(p => p.avatar); f.start(); f.advance(45_000);
  assert.deepEqual(f.room.players.map(p => p.avatar), before);
  f.room.players[1].alive = false; f.room.phase = 'victory'; f.command(f.room.host, 'rematch');
  assert.deepEqual(f.room.players.map(p => p.avatar), before);
  delete f.room.players[0].avatar; f.room.players[2].avatar = f.room.players[1].avatar;
  ensureAvatars(f.room); assert.equal(new Set(f.room.players.map(p => p.avatar)).size, 6);
});
test('requires 6–15 players and a valid Hollow balance', () => {
  const f = fixture(5); assert.throws(() => f.command(f.room.host,'start'), /6–15/);
  const g = fixture(6,6); assert.throws(() => g.command(g.room.host,'start'), /loyal Crew/);
  const h = fixture(15); assert.throws(() => addPlayer(h.room,'Extra'), /fifteen/);
});
test('ability scenario preserves configured roles and cryptographic seat credentials', () => {
  const { room, command } = fixture(10,2); command(room.host,'start');
  assert.equal(room.players.filter(p => p.role === 'hollow').length,2);
  assert.equal(room.players.filter(p => p.role === 'xenobiologist').length,1);
  assert.equal(new Set(room.players.map(p => p.token)).size,10);
  assert.equal(room.players.every(p => p.token.length === 64),true);
});
test('playing Captain cannot see other living roles, votes, tokens or private reports', () => {
  const { room, command } = fixture(); command(room.host,'start');
  room.players[1].reports = [{text:'secret',day:1}]; room.votes[room.players[1].id] = true;
  assert.equal(project(room,room.host).me.role,null);
  command(room.host,'reveal');
  const view = project(room,room.host);
  assert.equal(view.players.every(p => p.role === undefined),true);
  assert.equal(view.me.role,room.players[0].role);
  assert.equal(JSON.stringify(view).includes('secret'),false);
  assert.equal(JSON.stringify(view).includes(room.players[1].token),false);
  assert.equal('votes' in view,false);
});
test('non-playing Captain is excluded from dealing, voting and victory eligibility', () => {
  const { room, command } = fixture(7); command(room.host,'settings',{...room.settings,playing:false}); command(room.host,'start');
  assert.equal(room.players[0].role,null);
  assert.equal(project(room,room.host).players.filter(p => p.role).length,6);
  assert.throws(() => command(room.host,'acknowledge'),/living crew/);
});
test('only Captain can configure or advance phases; role dependencies validated', () => {
  const { room, command } = fixture();
  assert.throws(() => command(room.players[1].id,'start'),/Captain/);
  assert.throws(() => command(room.host,'settings',{...room.settings,roles:{...room.settings.roles,engineer:1}}),/at least two/);
  assert.throws(() => command(room.host,'settings',{...room.settings,roles:{...room.settings.roles,xenobiologist:0,observer:1}}),/possible Xenobiologist/);
});
test('every crew member acknowledges orders before first night', () => {
  const { room, command } = fixture(); command(room.host,'start');
  assert.throws(() => command(room.host,'night'),/acknowledge/);
  room.players.forEach(p => { command(p.id,'reveal'); command(p.id,'acknowledge'); }); assert.equal(room.phase,'night');
});
test('first night identifies Hollow but never kills', () => {
  const f = fixture(9,2); f.start();
  const h = f.room.players.filter(p => p.role === 'hollow');
  assert.equal(project(f.room,h[0].id).hollow.members.length,2);
  assert.equal(project(f.room,f.room.players.find(p => p.role === 'cadet').id).hollow,null);
  f.advance(45_000); assert.equal(f.room.phase,'discussion'); assert.equal(f.room.players.every(p => p.alive),true);
});
function secondNight(f) { f.start(); f.advance(45_000); f.command(f.room.host,'nominations'); f.command(f.room.host,'execute'); f.command(f.room.host,'night'); }
test('Hollow choices stream privately and only unanimity locks the attack', () => {
  const f = fixture(10,3); secondNight(f);
  const h = f.room.players.filter(p => p.role === 'hollow'), c = f.room.players.filter(p => p.role !== 'hollow');
  f.command(h[0].id,'station',{targets:[c[0].id]});
  assert.equal(project(f.room,h[1].id).hollow.members.find(p=>p.id===h[0].id).target,c[0].id);
  assert.equal(project(f.room,c[0].id).hollow,null);
  f.command(h[1].id,'station',{targets:[c[0].id]}); assert.equal(f.room.lockedTarget,null);
  f.command(h[2].id,'station',{targets:[c[1].id]}); assert.equal(f.room.lockedTarget,null);
  f.command(h[2].id,'station',{targets:[c[0].id]}); assert.equal(f.room.lockedTarget,c[0].id);
  assert.throws(()=>f.command(h[0].id,'station',{targets:[c[1].id]}),/sealed/);
  assert.equal(c[0].alive,true); f.advance(45_000); assert.equal(c[0].alive,false);
});
test('no agreement causes no automatic victim and late orders are rejected', () => {
  const f=fixture(9,2); secondNight(f); const h=f.room.players.filter(p=>p.role==='hollow'), c=f.room.players.filter(p=>p.role!=='hollow');
  f.command(h[0].id,'station',{targets:[c[0].id]}); f.advance(45_000);
  assert.equal(f.room.players.every(p=>p.alive),true);
  assert.throws(()=>f.command(h[1].id,'station',{targets:[c[0].id]}),/phase/);
});
test('orders arriving at the deadline are rejected even before the timer tick', () => {
  const f=fixture(); f.start(); const scanner=f.room.players.find(p=>p.role==='xenobiologist'), target=f.room.players.find(p=>p.role==='hollow');
  assert.throws(()=>act(f.room,scanner.id,'station',{targets:[target.id]},f.room.deadline),/window has closed/);
});
test('a single surviving Hollow may lock on themselves immediately', () => {
  const f=fixture(); secondNight(f); const h=f.room.players.find(p=>p.role==='hollow'), c=f.room.players.find(p=>p.role==='cadet');
  f.command(h.id,'station',{targets:[h.id]}); assert.equal(f.room.lockedTarget,h.id);
  assert.throws(()=>f.command(h.id,'station',{targets:[c.id]}),/sealed/);
});
test('scans resolve before attacks but killed actors receive no new private reports', () => {
  const f=fixture(); secondNight(f); const h=f.room.players.find(p=>p.role==='hollow'), scan=f.room.players.find(p=>p.role==='xenobiologist');
  f.command(scan.id,'station',{targets:[h.id]}); f.command(h.id,'station',{targets:[scan.id]}); f.advance(45_000);
  assert.equal(scan.alive,false); assert.equal(scan.reports.length,0); assert.equal(project(f.room,scan.id).hollow,null);
  f.command(f.room.host,'nominations'); f.command(f.room.host,'execute'); f.command(f.room.host,'night');
  assert.throws(()=>f.command(scan.id,'station',{targets:[h.id]}),/living crew/);
});
test('surviving scanner receives correct allegiance result', () => {
  const f=fixture(); f.start(); const h=f.room.players.find(p=>p.role==='hollow'), scan=f.room.players.find(p=>p.role==='xenobiologist');
  f.command(scan.id,'station',{targets:[h.id]}); f.advance(45_000); assert.match(scan.reports[0].text,/Hollow signature detected/);
});
test('analyst must choose two distinct other living players', () => {
  const f=fixture(); f.room.settings.roles.analyst=1; f.start(); const p=f.room.players.find(p=>p.role==='analyst'); const q=f.room.players.find(p=>p.role==='hollow');
  assert.throws(()=>f.command(p.id,'station',{targets:[q.id,q.id]}),/valid/);
  assert.throws(()=>f.command(p.id,'station',{targets:[q.id]}),/2 targets/);
  const r=f.room.players.find(x=>x.id!==p.id&&x.id!==q.id); f.command(p.id,'station',{targets:[q.id,r.id]}); f.advance(45_000); assert.match(p.reports[0].text,/at least one/);
});
test('Engineers have no starting identities while the Observatory Officer receives its briefing', () => {
  const f=fixture(10,2); f.room.settings.roles.engineer=2; f.room.settings.roles.observer=1; f.start(); f.advance(45_000);
  const engineers=f.room.players.filter(p=>p.role==='engineer'), observer=f.room.players.find(p=>p.role==='observer'), scan=f.room.players.find(p=>p.role==='xenobiologist');
  assert.deepEqual(engineers[0].reports,[]); assert.match(observer.reports[0].text,new RegExp(scan.name));
});
test('Beacon transmission is limited to physical neighbouring seats', () => {
  const f=fixture(8); f.room.settings.roles.beacon=1; f.start(); const p=f.room.players.find(p=>p.role==='beacon'), ids=adjacent(f.room,p.id);
  const other=f.room.players.find(q=>q.id!==p.id&&!ids.includes(q.id));
  assert.throws(()=>f.command(p.id,'station',{targets:[other.id]}),/eligible/);
  f.command(p.id,'station',{targets:[ids[0]]}); f.advance(45_000); assert.match(f.room.players.find(q=>q.id===ids[0]).reports[0].text,/Loyal Crew confirmed/);
});
test('Assistant receives passive casualty analysis without inheriting a scan', () => {
  const f=fixture(8);f.room.settings.reveal=false;f.room.settings.roles.assistant=1;secondNight(f);
  const assistant=f.room.players.find(p=>p.role==='assistant'), scan=f.room.players.find(p=>p.role==='xenobiologist'), h=f.room.players.find(p=>p.role==='hollow');
  f.command(h.id,'station',{targets:[scan.id]});f.advance(45_000);
  assert.equal(assistant.inherited,false);assert.match(assistant.reports.at(-1).text,/No dark cycle casualty had a Hollow signature/);
  assert.throws(()=>f.command(assistant.id,'ability',{targets:[h.id]}));
});
function ballot(f, from, to, yes) {
  f.command(f.room.host,'nominate',{from:from.id,to:to.id});
  f.room.players.filter(p=>p.playing&&p.alive).forEach((p,i)=>f.command(p.id,'vote',{execute:i<yes}));
  f.command(f.room.host,'closeVote');
}
test('self nomination works and half the living crew rounded up is the threshold', () => {
  const f=fixture(7); f.start(); f.advance(45_000); f.command(f.room.host,'nominations'); const p=f.room.players;
  ballot(f,p[0],p[0],3); assert.equal(f.room.block,null); ballot(f,p[1],p[1],4); assert.equal(f.room.block,p[1].id);
});
test('tied highest qualifying votes clear block; a strictly greater total restores it', () => {
  const f=fixture(8); f.start(); f.advance(45_000); f.command(f.room.host,'nominations'); const p=f.room.players;
  ballot(f,p[0],p[1],4); ballot(f,p[1],p[2],4); assert.equal(f.room.block,null); assert.equal(f.room.tied,true);
  ballot(f,p[2],p[3],3); assert.equal(f.room.block,null); ballot(f,p[3],p[4],5); assert.equal(f.room.block,p[4].id);
  f.command(f.room.host,'execute'); assert.equal(f.room.lastDeaths.length,1); assert.equal(p[4].alive,false); assert.equal(f.room.block,null);
});
test('nominators and nominees cannot repeat within a day; ballots cannot change', () => {
  const f=fixture(); f.start(); f.advance(45_000); f.command(f.room.host,'nominations'); const p=f.room.players;
  f.command(f.room.host,'nominate',{from:p[0].id,to:p[1].id}); f.command(p[0].id,'vote',{execute:true});
  assert.throws(()=>f.command(p[0].id,'vote',{execute:false}),/sealed/);
  assert.throws(()=>f.command(f.room.host,'closeVote'),/every living/);
  p.slice(1).forEach(q=>f.command(q.id,'vote',{execute:false})); f.command(f.room.host,'closeVote');
  assert.throws(()=>f.command(f.room.host,'nominate',{from:p[0].id,to:p[2].id}),/already nominated/);
});
test('death reveal toggle changes public roles; dead players cannot vote or act', () => {
  const f=fixture(); f.start(); f.advance(45_000); const dead=f.room.players[1]; dead.alive=false; f.room.settings.reveal=false;
  assert.equal(project(f.room,f.room.host).players.find(p=>p.id===dead.id).role,undefined);
  f.room.settings.reveal=true; assert.equal(project(f.room,f.room.host).players.find(p=>p.id===dead.id).role,dead.role);
  f.command(f.room.host,'nominations'); f.command(f.room.host,'nominate',{from:f.room.players[0].id,to:f.room.players[2].id}); assert.throws(()=>f.command(dead.id,'vote',{execute:true}),/living crew/);
});
test('Crew victory awards every winning team member including dead players exactly once', () => {
  const f=fixture(); f.start(); f.advance(45_000); f.command(f.room.host,'nominations');
  const h=f.room.players.find(p=>p.role==='hollow'), c=f.room.players.find(p=>p.role==='cadet'); c.alive=false;
  ballot(f,f.room.players.find(p=>p.alive),h,5); f.command(f.room.host,'execute'); assert.equal(f.room.winner,'crew');
  assert.equal(c.score,1); assert.equal(h.score,0); assert.throws(()=>f.command(f.room.host,'execute'),/phase/);
  f.command(f.room.host,'rematch'); assert.equal(f.room.phase,'lobby'); assert.equal(c.score,1); assert.equal(f.room.players.every(p=>p.role===null&&p.alive),true);
});
test('Hollow win at living parity', () => {
  const f=fixture(6,2); secondNight(f); const h=f.room.players.filter(p=>p.role==='hollow'), c=f.room.players.filter(p=>p.role!=='hollow'); c[0].alive=false;
  h.forEach(p=>f.command(p.id,'station',{targets:[c[1].id]})); f.advance(45_000); assert.equal(f.room.winner,'hollow'); assert.equal(h[0].score,1);
});
test('Captain disconnect pauses and all connected crew must consent to succession', () => {
  const f=fixture(); f.start(); const old=f.room.host; connection(f.room,old,false,1_000_000); assert.equal(f.room.pause.reason,'captain'); assert.equal(f.advance(90_000),false);
  const others=f.room.players.filter(p=>p.id!==old); others.slice(0,-1).forEach(p=>f.command(p.id,'consent')); assert.equal(f.room.host,old);
  f.command(others.at(-1).id,'consent'); assert.equal(f.room.host,others[0].id);
  assert.equal(f.room.pause.reason,'connection'); connection(f.room,old,true,1_090_000); assert.equal(f.room.pause,null); assert.equal(f.room.host,others[0].id);
});
test('night disconnect freezes remaining time and resumes only after reconnection', () => {
  const f=fixture(); f.start(); const p=f.room.players[1]; connection(f.room,p.id,false,1_010_000); assert.equal(f.room.pause.remaining,35_000); assert.equal(f.advance(90_000),false);
  connection(f.room,p.id,true,1_090_000); assert.equal(f.room.deadline,1_125_000); assert.equal(f.room.pause,null);
});
test('role catalogue is complete for every selectable role', () => { const f=fixture(); assert.ok(Object.keys(f.room.settings.roles).every(key=>ROLES[key]?.description&&ROLES[key]?.timing)); });
test('Captain can release a lobby berth but cannot remove players during play', () => {
  const f=fixture(7), target=f.room.players[1];
  assert.throws(()=>f.command(target.id,'remove',{id:f.room.players[2].id}),/Captain/);
  f.command(f.room.host,'remove',{id:target.id}); assert.equal(f.room.players.length,6);
  assert.throws(()=>f.command(f.room.host,'remove',{id:f.room.host}),/own berth/);
  f.start(); assert.throws(()=>f.command(f.room.host,'remove',{id:f.room.players[1].id}),/phase/);
});

test('Captain can save and launch passive Assistant without a Xenobiologist',()=>{
  const f=fixture(6);const roles=Object.fromEntries(Object.keys(ROLES).map(key=>[key,0]));Object.assign(roles,{assistant:1,cadet:8});
  f.command(f.room.host,'settings',{...f.room.settings,roles,reveal:false});
  assert.equal(f.room.settings.roles.xenobiologist,0);assert.equal(f.room.settings.roles.assistant,1);
  assert.throws(()=>f.command(f.room.host,'settings',{...f.room.settings,reveal:true}),/Research Assistant/);
  f.start();f.advance(45_000);const assistant=f.room.players.find(p=>p.role==='assistant');assert.match(assistant.reports.at(-1).text,/No casualties to analyse/);
});
