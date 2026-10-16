import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLES,isHollow,canHunt,DEFAULT_SETTINGS} from '../public/roles.js';
import {createRoom,addPlayer,act,tick,project,connection,ensureAvatars} from '../server/game.js';
import {resolveAbilities,abilityView,huntView} from '../server/abilities.js';
import {startingReports,deliverReports,dealPool} from '../server/moderator.js';
import {poolError} from '../public/setup.js';

import {scenario} from './helpers/character-scenario.js';

const base=(role,n=8)=>[role,'hollow',...Array(n-2).fill('cadet')];

for(const [key,role] of Object.entries(ROLES)) test(`${role.name}: day/dead/paused/hidden capabilities expose no selectable targets`,()=>{
  const s=scenario(base(key),1),p=s.p[0];
  for(const phase of ['lobby','orders','discussion','nominations','voting','aftermath','victory']) {
    s.room.phase=phase;
    assert.equal(abilityView(s.room,p,s.now()).active,false);assert.deepEqual(abilityView(s.room,p,s.now()).targets,[]);
    assert.equal(huntView(s.room,p,s.now()).active,false);
    assert.throws(()=>s.use(0,[]));assert.throws(()=>s.hunt(0,2));
  }
  s.room.phase='night';s.room.deadline=s.now()+10000;
  p.alive=false;assert.equal(abilityView(s.room,p,s.now()).active,false);assert.throws(()=>s.use(0,[]));
  p.alive=true;p.revealed=false;assert.deepEqual(project(s.room,p.id).me.orders.ability.targets,[]);assert.throws(()=>s.use(0,[]));
  p.revealed=true;s.room.pause={reason:'connection',remaining:10000};assert.equal(abilityView(s.room,p,s.now()).active,false);assert.throws(()=>s.use(0,[]));
});

test('all attacking evil identities retain scans and shared attack',()=>{
  const evil=Object.keys(ROLES).filter(canHunt);
  for(const role of evil) {
    const s=scenario(['xenobiologist',role,...Array(6).fill('cadet')]);s.use(0,[1]);
    assert.ok(project(s.room,s.p[1].id).hollow.members.some(p=>p.id===s.p[1].id));
    const view=abilityView(s.room,s.p[1],s.now());if(view.active)s.pass(1);
    s.hunt(1,7);s.dawn();assert.match(s.texts(0),/Hollow signature detected/);assert.equal(s.p[7].alive,false);
  }
});

test('each actionable character validates count, self, target life and mode using its night descriptor',()=>{
  const targets={engineer:[2,3],xenobiologist:[2],analyst:[2,3],beacon:[1],resonance:[2,3],warden:[2],medic:[2],arbiter:[0],diver:[2],stasis:[0],cartographer:[2,3,4],jammer:[2],dreadcaster:[2],leech:[2],breachborn:[2],thief:[2],forger:[2],wardbreaker:[2],parasite:[2]};
  for(const [role,indices] of Object.entries(targets)) {
    const s=scenario(base(role),['beacon','warden'].includes(role)?1:2);
    if(['medic','diver'].includes(role)){s.p[2].alive=false;s.p[2].diedDay=s.room.day-1;}
    assert.equal(abilityView(s.room,s.p[0],s.now()).active,true,role);
    assert.throws(()=>s.use(0,Array(4).fill(2)),/valid/);
    if(!['arbiter','stasis'].includes(role))assert.throws(()=>s.use(0,[0]),role==='engineer'||role==='analyst'||role==='resonance'||role==='cartographer'?/Select/:/eligible/);
    if(role==='arbiter')assert.throws(()=>s.use(0,[2]),/mute/);
    s.use(0,indices,role==='arbiter'?'noVote':undefined);
    assert.equal(abilityView(s.room,s.p[0],s.now()).submitted,true,role);
  }
});

test('once-per-game inspection consumes once, correct facts arrive only at dawn, repeats cannot spend twice',()=>{
  for(const role of ['diver','cartographer','thief']) {
    const s=scenario(base(role));if(role==='diver')s.p[2].alive=false;
    const ids=role==='cartographer'?[1,2,3]:[2];s.use(0,ids);
    assert.equal(s.p[0].usedOnce,false);assert.equal(s.p[0].reports.length,0);
    s.dawn();assert.equal(s.p[0].usedOnce,true);assert.ok(s.p[0].reports.length);
    if(role==='cartographer')assert.match(s.texts(0),/1 Hollow/);else assert.match(s.texts(0),/Cadet/);
    s.next();assert.equal(abilityView(s.room,s.p[0],s.now()).active,false);assert.throws(()=>s.use(0,ids),/spent/);
  }
});

test('Resonance equality differs from Signal Analyst OR and all comparisons are factual',()=>{
  for(const [targets,same] of [[[1,2],true],[[3,4],true],[[1,3],false]]) {
    const s=scenario(['resonance','hollow','jammer','cadet','cadet','cadet','cadet','cadet']);s.use(0,targets);s.dawn();
    assert.match(s.texts(0),same?/same allegiance/:/different allegiances/);
  }
});

test('Warden absorbs before Sentinel; jamming Warden exposes Sentinel without spending it prematurely',()=>{
  const s=scenario(['warden','sentinel','jammer',...Array(5).fill('cadet')],1);
  s.use(0,[1]);s.pass(2);s.dawn();s.next();s.pass(2);s.hunt(2,1);s.dawn();
  assert.equal(s.p[1].alive,true);assert.equal(s.p[1].sentinelUsed,false);
  s.next();s.use(2,[0]);s.hunt(2,1);s.dawn();assert.equal(s.p[1].alive,true);assert.equal(s.p[1].sentinelUsed,true);
  assert.equal(s.texts(0),'Ward linked to Crew 1.');assert.equal(s.p[0].boundId,s.p[1].id);
});

test('Wardbreaker removes Warden and Sentinel protection without spending Sentinel charge',()=>{
  const s=scenario(['warden','sentinel','wardbreaker',...Array(5).fill('cadet')],1);
  s.use(0,[1]);s.pass(2);s.dawn();s.next();s.use(2,[1]);s.hunt(2,1);s.dawn();
  assert.equal(s.p[1].alive,false);assert.equal(s.p[1].sentinelUsed,false);
});

test('extra attack respects Warden and deduplicates a shared victim; first-night attack rejected',()=>{
  const s=scenario(['warden','sentinel','breachborn',...Array(5).fill('cadet')],1);
  s.use(0,[1]);assert.throws(()=>s.use(2,[1]),/dark cycle two/);assert.throws(()=>s.hunt(2,1),/first dark cycle/);s.dawn();
  s.next();s.use(2,[1]);s.hunt(2,1);s.dawn();assert.equal(s.p[1].alive,true);assert.equal(s.room.lastDeaths.length,0);assert.equal(s.p[2].usedOnce,true);assert.equal(s.p[1].sentinelUsed,false);
  const t=scenario(['breachborn','sentinel',...Array(4).fill('cadet')]);
  t.use(0,[1]);t.hunt(0,1);t.dawn();assert.equal(t.p[1].alive,true);assert.equal(t.p[1].sentinelUsed,true);
});

test('Jammer blocks active and passive information, refunds once uses and never exposes caster metadata',()=>{
  for(const role of ['xenobiologist','resonance','cartographer','diver','proximity','surveyor','beacon','medic','stasis','arbiter']) {
    const s=scenario([role,'jammer',...Array(6).fill('cadet')],['surveyor','beacon'].includes(role)?1:2);
    if(['diver','medic'].includes(role)){s.p[2].alive=false;s.p[2].diedDay=s.room.day-1;}
    const action=abilityView(s.room,s.p[0],s.now());if(action.active)s.use(0,action.targets.slice(0,action.count).map(id=>s.p.findIndex(p=>p.id===id)),role==='arbiter'?'mute':undefined);
    s.use(1,[0]);s.dawn();assert.equal(s.texts(0),'',role);assert.equal(s.p[0].usedOnce,false,role);
    assert.equal(s.p[0].reports.some(r=>['scan','resonance','cartography','record','neighbours','survey'].includes(r.kind)),false,role);
    assert.equal(JSON.stringify(s.p[0].reports).includes(s.p[1].id),false,role);
    assert.equal(s.p.some(p=>p.status.mute||p.status.stasis),false,role);
  }
});

test('surviving Warden commitment protects despite Warden dying in same attack batch',()=>{
  const s=scenario(['warden','breachborn','cadet','cadet','cadet','cadet','cadet','cadet'],1);s.use(0,[2]);s.dawn();s.next();
  s.use(1,[0]);s.hunt(1,2);s.dawn();assert.equal(s.p[0].alive,false);assert.equal(s.p[2].alive,true);
});

test('Medic recent window excludes older deaths; revival preserves spent uses and no action this night',()=>{
  const s=scenario(['medic','cartographer','hollow',...Array(5).fill('cadet')]);s.p[1].alive=false;s.p[1].diedDay=1;s.p[1].usedOnce=true;s.p[3].alive=false;s.p[3].diedDay=0;
  assert.throws(()=>s.use(0,[3]),/eligible/);s.use(0,[1]);s.dawn();assert.equal(s.p[1].alive,true);assert.equal(s.p[1].usedOnce,true);
  assert.equal(s.p[1].reports.length,1);assert.match(s.texts(1),/powers|abilities resume next dark cycle/);assert.equal(s.p[0].usedOnce,true);
});

test('night victory waits for revival, including resurrection of a Hollow',()=>{
  const s=scenario(['medic','cadet','hollow','cadet','cadet','cadet'],2);
  for(const i of [1,4,5]){s.p[i].alive=false;s.p[i].diedDay=i===1?1:0;}
  s.use(0,[1]);s.hunt(2,3);s.dawn();assert.equal(s.room.phase,'discussion');assert.equal(s.p[1].alive,true);
  const t=scenario(['medic','hollow','hollow','cadet','cadet','cadet']);
  for(const i of [1,5]){t.p[i].alive=false;t.p[i].diedDay=i===1?1:0;}
  t.use(0,[1]);t.hunt(2,3);t.dawn();assert.equal(t.room.winner,'hollow');assert.equal(t.p[1].alive,true);
});

test('dead Medic cannot revive; dead investigators and recipients receive no pending reports',()=>{
  const s=scenario(base('medic'));s.p[2].alive=false;s.p[2].diedDay=1;s.use(0,[2]);s.hunt(1,0);s.dawn();assert.equal(s.p[2].alive,false);assert.deepEqual(s.p[0].reports,[]);
  const t=scenario(base('xenobiologist'));t.use(0,[1]);t.hunt(1,0);t.dawn();assert.deepEqual(t.p[0].reports,[]);
});

test('Proximity counts final revived living neighbours, Surveyor counts initial adjacent Hollow edges',()=>{
  const s=scenario(['proximity','medic','hollow','cadet','cadet','cadet']);s.p[5].alive=false;s.p[5].diedDay=1;s.use(1,[5]);s.hunt(2,1);s.dawn();
  assert.match(s.texts(0),/Crew 4.*1 Hollow/); // dead Medic: nearest clockwise is Hollow, counterclockwise Crew 4
  const t=scenario(['surveyor','hollow','jammer','cadet','cadet','cadet'],1);t.pass(2);t.dawn();assert.match(t.texts(0),/1 adjacent Hollow pair\./);
});

test('starting Oracle knows exact unused cards; all initial reports remain gated until reveal',()=>{
  const s=scenario(['oracle','engineer','engineer','observer','xenobiologist','cadet']);s.room.unused=['jammer','cadet','medic'];
  deliverReports(s.room,startingReports(s.room));assert.match(s.texts(0),/Static Jammer, Cadet, Reclamation Medic/);
  for(const p of s.p){p.revealed=false;assert.deepEqual(project(s.room,p.id).me.reports,[]);}
});

test('control effects expire, mute does not remove vote, restricted voters cannot cast or change denominator',()=>{
  const s=scenario(['arbiter','leech','hollow',...Array(5).fill('cadet')]);s.use(0,[3],'mute');s.use(1,[3]);s.dawn();
  assert.equal(s.p[3].status.mute,true);assert.equal(s.p[3].status.noVote,true);assert.match(s.texts(3),/Voting suspended/);
  s.command(0,'nominations');s.command(0,'nominate',{from:s.p[3].id,to:s.p[3].id});assert.equal(s.room.eligibleVoters.length,7);
  assert.throws(()=>s.command(3,'vote',{execute:true}),/suspended/);
  for(let i=0;i<8;i++)if(i!==3)s.command(i,'vote',{execute:i<4});s.command(0,'closeVote');assert.equal(s.room.nominations[0].total,7);
  s.room.phase='aftermath';s.next();assert.deepEqual(s.p[3].status,{});
  const t=scenario(base('arbiter'));t.use(0,[0],'mute');t.dawn();assert.equal(project(t.room,t.p[0].id).me.eligibleVote,true);
});

test('Dreadcaster cannot repeat consecutive target; pass resets restriction, source is never public',()=>{
  const s=scenario(base('dreadcaster'));s.use(0,[2]);s.dawn();assert.equal(project(s.room,s.p[2].id).players[2].muted,true);s.next();assert.throws(()=>s.use(0,[2]),/eligible/);s.pass(0);s.dawn();s.next();s.use(0,[2]);
  assert.equal(s.room.log.some(r=>r.text.includes('Dreadcaster')),false);
});

test('Stasis survives caster death, consumes daily execution, respects five-alive boundary and Auditor death-only record',()=>{
  for(const aliveCount of [4,5]) {
    const s=scenario(['stasis','hollow','auditor',...Array(5).fill('cadet')]);s.use(0,[3]);s.hunt(1,0);s.dawn();
    while(s.p.filter(p=>p.alive).length>aliveCount)s.p[s.p.findLastIndex(p=>p.alive&&p.id!==s.p[3].id&&p.id!==s.p[2].id&&p.id!==s.p[1].id)].alive=false;
    s.room.phase='nominations';s.room.block=s.p[3].id;s.command(0,'execute');assert.equal(s.p[3].alive,aliveCount===5);assert.equal(s.room.block,null);
    s.next();s.dawn();assert.match(s.texts(2),aliveCount===5?/No player died by execution/:/Cadet/);
  }
});

test('Forger preserves historical facts; Parasite cannot bypass delay but may copy due delivery next dawn',()=>{
  const s=scenario(['xenobiologist','forger','parasite',...Array(5).fill('cadet')]);s.use(0,[1]);s.use(1,[0]);s.use(2,[0]);s.dawn();
  assert.match(s.texts(0),/delayed until the light cycle 3/);assert.equal(s.p[0].reports.some(r=>r.kind==='scan'),false);assert.match(s.texts(2),/No eligible/);
  s.next();s.use(0,[3]); // due record was observed during cycle 2, target is now different
  s.dawn();const records=s.p[0].reports.filter(r=>r.kind==='scan');assert.equal(records.length,2);assert.equal(records[0].day,2);assert.match(records[0].text,/Hollow signature/);assert.equal(records[1].day,3);assert.match(records[1].text,/no Hollow/);
  const t=scenario(['xenobiologist','forger','parasite',...Array(5).fill('cadet')]);t.use(0,[1]);t.use(1,[0]);t.dawn();t.next();t.use(2,[0]);t.dawn();assert.match(t.texts(2),/Observed cycle 2:.*Hollow signature/);
});

test('delayed report is discarded if recipient dies before release; later revival does not deliver it',()=>{
  const s=scenario(['xenobiologist','forger','medic',...Array(5).fill('cadet')]);s.use(0,[1]);s.use(1,[0]);s.dawn();s.next();s.pass(1);s.hunt(1,0);s.dawn();assert.equal(s.p[0].reports.some(r=>r.kind==='scan'),false);
  s.next();s.use(2,[0]);s.dawn();assert.equal(s.p[0].alive,true);assert.equal(s.p[0].reports.some(r=>r.kind==='scan'),false);
});

test('Forger never delays status instructions; Parasite never copies statuses or starting identities',()=>{
  const s=scenario(['arbiter','forger','parasite',...Array(5).fill('cadet')]);s.use(0,[0],'noVote');s.use(1,[0]);s.use(2,[0]);s.dawn();assert.match(s.texts(0),/Voting suspended/);assert.equal(s.room.deferredReports.length,0);assert.match(s.texts(2),/No eligible/);
});

test('Hollow specials require own order before shared victim; no consensus still resolves specials; consensus locks everything',()=>{
  const s=scenario(['jammer','hollow','xenobiologist',...Array(5).fill('cadet')]);assert.throws(()=>s.hunt(0,2),/special order/);s.use(0,[2]);s.use(2,[0]);s.hunt(0,3);assert.throws(()=>s.use(0,[4]),/Clear/);s.dawn();assert.equal(s.p.every(p=>p.alive),true);assert.equal(s.texts(2),'');
  const t=scenario(['jammer','hollow',...Array(6).fill('cadet')]);t.pass(0);t.hunt(0,2);t.hunt(1,2);assert.throws(()=>t.pass(0),/sealed/);assert.throws(()=>t.command(0,'hunt',{pass:true}),/sealed/);
});

test('resolution and JSON restart preserve charges/queues/results; duplicate dawn cannot add reports or kills',()=>{
  const s=scenario(['xenobiologist','forger',...Array(6).fill('cadet')]);s.use(0,[1]);s.use(1,[0]);s.dawn();const before=JSON.stringify(s.room);
  resolveAbilities(s.room);assert.equal(JSON.stringify(s.room),before);
  const restored=JSON.parse(before);ensureAvatars(restored);assert.deepEqual(restored.players[1].delayTargets,[restored.players[0].id]);assert.equal(restored.deferredReports.length,1);
  resolveAbilities(restored);assert.equal(restored.deferredReports.length,1);assert.equal(restored.players[0].reports.length,s.p[0].reports.length);
});

test('specialists are included in pool faction bounds and a launch can deal them without leaking assignments',()=>{
  const roles={...Object.fromEntries(Object.keys(ROLES).map(key=>[key,0])),cadet:6,jammer:1,forger:1,xenobiologist:1};
  assert.equal(poolError(6,roles),null);for(const choose of [()=>0,n=>n-1]){const d=dealPool(6,roles,choose);assert.ok(d.assigned.some(isHollow));assert.ok(d.assigned.filter(isHollow).length<=2);}
  assert.equal(poolError(6,{...roles,forger:0,breachborn:1}),null);
});


test('revival does not release a report from a night the recipient spent dead',()=>{
  const s=scenario(['xenobiologist','forger','medic',...Array(5).fill('cadet')]);s.use(0,[1]);s.use(1,[0]);s.dawn();
  s.p[0].alive=false;s.p[0].diedDay=2;s.p[0].deathPhase='execution';s.next();s.use(2,[0]);s.dawn();
  assert.equal(s.p[0].alive,true);assert.equal(s.p[0].reports.some(r=>r.kind==='scan'),false);assert.equal(s.room.deferredReports.length,0);
});

test('forged pass or action at deadline cannot alter choices; zero eligible voters cannot nominate an execution',()=>{
  const s=scenario(base('arbiter'));s.use(0,[2],'mute');const before=JSON.stringify(s.room.nightChoices);
  assert.throws(()=>act(s.room,s.p[0].id,'ability',{pass:true},s.room.deadline),/closed/);assert.equal(JSON.stringify(s.room.nightChoices),before);
  s.dawn();s.command(0,'nominations');for(const p of s.p)p.status.noVote=true;
  assert.throws(()=>s.command(0,'nominate',{from:s.p[0].id,to:s.p[2].id}),/No eligible/);s.command(0,'execute');assert.equal(s.p.every(p=>p.alive),true);
});

test('new roles, target snapshots and source-free private payloads survive a paused JSON reload',()=>{
  const s=scenario(['jammer','xenobiologist',...Array(6).fill('cadet')]);s.use(0,[1]);s.use(1,[0]);
  const restored=JSON.parse(JSON.stringify(s.room));ensureAvatars(restored);assert.deepEqual(restored.specialChoices,s.room.specialChoices);
  restored.pause={reason:'connection',remaining:1000};assert.deepEqual(project(restored,s.p[0].id).me.orders.ability.targets,[]);restored.pause=null;
  tick(restored,restored.deadline);const reports=project(restored,s.p[1].id).me.reports;
  for(const r of reports){assert.deepEqual(Object.keys(r).sort(),['day','id','kind','text','timing']);assert.match(r.id,/^[0-9a-f-]{36}$/);assert.equal(JSON.stringify(r).includes(s.p[0].id),false);}
});

test('Proximity includes a genuinely revived Hollow neighbour only in the dawn observation',()=>{
  const s=scenario(['proximity','medic','hollow','cadet','cadet','cadet','cadet','hollow']);
  s.p[7].alive=false;s.p[7].diedDay=1;s.use(1,[7]);assert.equal(s.p[0].reports.length,0);s.dawn();
  assert.equal(s.p[7].alive,true);assert.match(s.texts(0),/Crew 7 \+ Crew 1: 1 Hollow/);
});

test('compound revival, historical record, delay and interception preserve the original observation',()=>{
  const s=scenario(['diver','medic','forger','parasite','sentinel','cadet','cadet','cadet','cadet']);
  s.p[4].alive=false;s.p[4].diedDay=1;s.p[4].sentinelUsed=true;
  s.use(0,[4]);s.use(1,[4]);s.use(2,[0]);s.pass(3);s.dawn();
  assert.equal(s.p[4].alive,true);assert.equal(s.p[4].sentinelUsed,true);assert.equal(s.p[0].reports.some(r=>r.kind==='record'),false);
  s.next();s.use(3,[0]);s.dawn();assert.match(s.texts(3),/Observed cycle 2: Crew 4: Hull Sentinel/);
  assert.equal(s.p[0].usedOnce,true);assert.equal(s.p[1].usedOnce,true);assert.deepEqual(s.p[2].delayTargets,[s.p[0].id]);assert.equal(s.p[3].usedOnce,true);
});

test('voting disconnect pauses without shrinking the frozen electorate or silently casting a ballot',()=>{
  const s=scenario(base('arbiter'));s.dawn();s.command(0,'nominations');s.command(0,'nominate',{from:s.p[0].id,to:s.p[2].id});
  const ids=[...s.room.eligibleVoters];connection(s.room,s.p[3].id,false,s.now());assert.equal(s.room.pause.reason,'connection');
  assert.deepEqual(s.room.eligibleVoters,ids);assert.equal(s.p[3].id in s.room.votes,false);assert.throws(()=>s.command(0,'closeVote'),/paused/);
  connection(s.room,s.p[3].id,true,s.now());assert.equal(s.room.pause,null);assert.deepEqual(s.room.eligibleVoters,ids);
});


test('Engineer identifies zero, one or both matches privately and can inspect again next night',()=>{
  for(const roles of [ ['engineer','hollow','cadet','cadet','cadet','cadet'], ['engineer','hollow','engineer','cadet','cadet','cadet'], ['engineer','hollow','engineer','engineer','cadet','cadet'] ]) {
    const s=scenario(roles,1);s.use(0,[2,3]);assert.equal(s.texts(0),'');s.dawn();
    const names=[2,3].filter(i=>roles[i]==='engineer').map(i=>s.p[i].name);
    assert.equal(s.texts(0),names.length?`Engineer match confirmed: ${names.join(', ')}.`:'Neither selected player is a Linked Engineer.');
    assert.ok(s.p.slice(1).every(p=>p.reports.length===0));assert.equal(s.p[0].usedOnce,false);
    s.next();assert.equal(abilityView(s.room,s.p[0],s.now()).active,true);
    s.use(0,[1,4]);s.dawn();
    assert.equal(s.p[0].reports.length,2);assert.equal(s.p[0].reports[1].text,'Neither selected player is a Linked Engineer.');
  }
});
test('jammed Engineer keeps diagnostic use and receives no match result',()=>{
  const s=scenario(['engineer','jammer','engineer','cadet','cadet','cadet'],1);
  s.use(0,[2,3]);s.use(1,[0]);s.dawn();assert.equal(s.p[0].usedOnce,false);assert.doesNotMatch(s.texts(0),/match confirmed/);
});
test('Engineer candidate pool accepts more than two cards',()=>{
  const roles={...Object.fromEntries(Object.keys(DEFAULT_SETTINGS.roles).map(key=>[key,0])),engineer:4,hollow:3,cadet:11};
  assert.equal(poolError(15,roles),null);
});

test('Engineer diagnostic can be delayed and intercepted only upon delivery',()=>{
  const s=scenario(['engineer','forger','parasite','engineer','cadet','cadet'],1);
  s.use(0,[3,4]);s.use(1,[0]);s.use(2,[0]);s.dawn();
  assert.doesNotMatch(s.texts(0),/match confirmed/);assert.match(s.texts(2),/No eligible transmission/);
  s.next();s.dawn();assert.match(s.texts(0),/Engineer match confirmed: Crew 3/);
});
test('Engineer reports are withheld on death, while other surviving Engineers resolve independently',()=>{
  const s=scenario(['engineer','hollow','engineer','engineer','cadet','cadet']);
  s.use(0,[2,3]);s.use(2,[0,3]);s.hunt(1,0);s.dawn();
  assert.equal(s.p[0].alive,false);assert.equal(s.texts(0),'');assert.match(s.texts(2),/Crew 0, Crew 3/);
});

test('Resonance can wait through a night, then resolve once and reject further use',()=>{
  const s=scenario(['resonance','hollow','cadet','cadet','cadet','cadet'],1);
  s.pass(0);s.dawn();assert.equal(s.p[0].usedOnce,false);assert.equal(s.texts(0),'');
  s.next();assert.equal(abilityView(s.room,s.p[0],s.now()).once,true);
  s.use(0,[2,3]);s.dawn();assert.match(s.texts(0),/same allegiance/);assert.equal(s.p[0].usedOnce,true);
  s.next();assert.equal(abilityView(s.room,s.p[0],s.now()).active,false);assert.throws(()=>s.use(0,[2,3]),/spent/);
});

test('restrictions are public at dawn with no source disclosure and expire next night',()=>{
  const s=scenario(['arbiter','leech','hollow','cadet','cadet','cadet'],1);
  s.use(0,[3],'mute');s.use(1,[3]);
  assert.equal(project(s.room,s.p[4].id).players[3].muted,false);
  s.dawn();
  for(const viewer of s.p) {
    const v=project(s.room,viewer.id);assert.equal(v.players[3].muted,true);assert.equal(v.players[3].noVote,true);
    assert.ok(v.log.some(l=>l.text==='Crew 3: speech restricted until the next Dark Cycle.'));
    assert.ok(v.log.some(l=>l.text==='Crew 3: voting suspended until the next Dark Cycle.'));
    assert.ok(v.log.every(l=>!l.text.includes('Arbiter')&&!l.text.includes('Leech')));
  }
  s.next();assert.equal(project(s.room,s.p[4].id).players[3].muted,false);assert.equal(project(s.room,s.p[4].id).players[3].noVote,false);
});
test('Surveyor reports zero, one or multiple adjacent pairs from the playing seating order',()=>{
  for(const [roles,count] of [ [['surveyor','hollow','cadet','cadet','cadet','cadet'],0], [['surveyor','hollow','hollow','cadet','cadet','cadet'],1], [['surveyor','hollow','hollow','hollow','cadet','cadet'],2] ]) {
    const s=scenario(roles,1);s.dawn();assert.equal(s.texts(0),`Initial manifest: ${count} adjacent Hollow ${count===1?'pair':'pairs'}.`);
  }
});
test('Captain manages clockwise seats only before launch; observer berth excluded from adjacency',()=>{
  const room=createRoom('Captain');for(let i=1;i<7;i++)addPlayer(room,'Crew '+i);
  act(room,room.host,'settings',{...room.settings,playing:false});
  const ids=room.players.map(p=>p.id), captain=room.host;
  assert.throws(()=>act(room,ids[1],'move-seat',{id:ids[2],direction:-1}),/Captain/);
  assert.throws(()=>act(room,captain,'move-seat',{id:captain,direction:1}),/berth/);
  act(room,captain,'move-seat',{id:ids[2],direction:-1});
  assert.deepEqual(room.players.map(p=>p.id),[ids[0],ids[2],ids[1],...ids.slice(3)]);
  assert.deepEqual(project(room,ids[2]).me.adjacent,[ids[6],ids[1]]);
  const restored=JSON.parse(JSON.stringify(room));assert.deepEqual(project(restored,ids[2]).me.adjacent,[ids[6],ids[1]]);
  act(room,captain,'start');assert.throws(()=>act(room,captain,'move-seat',{id:ids[1],direction:1}),/phase/);
});
test('Auditor is incompatible with public reveals in settings and legacy launch',()=>{
  const room=createRoom('Captain');for(let i=1;i<6;i++)addPlayer(room,'Crew '+i);
  const roles={...room.settings.roles,cadet:4,auditor:1};
  assert.match(poolError(6,roles,true),/reveals/);assert.equal(poolError(6,roles,false),null);
  assert.throws(()=>act(room,room.host,'settings',{...room.settings,roles}),/reveals/);
  act(room,room.host,'settings',{...room.settings,roles,reveal:false});
  room.settings.reveal=true;assert.throws(()=>act(room,room.host,'start'),/reveals/);
});

test('Hollow may unanimously attack a dead player, another Hollow or themselves',()=>{
  const dead=scenario(['hollow','hollow','cadet','cadet','cadet','cadet']);dead.p[5].alive=false;
  assert.deepEqual(huntView(dead.room,dead.p[0],dead.now()).targets,dead.p.map(p=>p.id));
  dead.hunt(0,5);assert.equal(dead.room.lockedTarget,null);dead.hunt(1,5);dead.dawn();
  assert.deepEqual(dead.room.lastDeaths,[]);assert.ok(dead.room.log.some(l=>l.text==='Light cycle arrives. No crew member died.'));
  const ally=scenario(['hollow','hollow','cadet','cadet','cadet','cadet']);
  ally.hunt(0,1);ally.hunt(1,1);ally.dawn();assert.equal(ally.p[1].alive,false);assert.deepEqual(ally.room.lastDeaths,[ally.p[1].id]);
  const self=scenario(['hollow','cadet','cadet','cadet','cadet','cadet']);
  self.hunt(0,0);self.dawn();assert.equal(self.p[0].alive,false);assert.equal(self.room.winner,'crew');
});
test('Hollow consensus stays private, excludes an overseeing Captain, and closes at the shared deadline',()=>{
  const s=scenario(['hollow','hollow','cadet','cadet','cadet','cadet']);
  s.hunt(0,2);assert.equal(project(s.room,s.p[1].id).hollow.members[0].target,s.p[2].id);
  assert.equal(project(s.room,s.p[2].id).hollow,null);
  s.p[5].playing=false;assert.ok(!huntView(s.room,s.p[0],s.now()).targets.includes(s.p[5].id));
  assert.throws(()=>s.command(0,'hunt',{targets:[s.p[5].id]}),/player aboard/);
  assert.throws(()=>act(s.room,s.p[1].id,'hunt',{targets:[s.p[2].id]},s.room.deadline),/closed/);
  s.dawn();assert.equal(s.p[2].alive,true);
});


test('extra attack is usable with five alive, rejects four alive, and can cause two public deaths',()=>{
  const five=scenario(['breachborn','cadet','cadet','cadet','cadet','cadet']);five.p[5].alive=false;
  five.use(0,[1]);five.hunt(0,2);five.dawn();
  assert.deepEqual(new Set(five.room.lastDeaths),new Set([five.p[1].id,five.p[2].id]));
  for(const p of five.p) {
    const v=project(five.room,p.id);assert.equal(v.lastDeaths.length,2);
    assert.equal(v.players.filter(p=>v.lastDeaths.includes(p.id)&&!p.alive).length,2);
    assert.equal(v.log.filter(l=>l.text.includes('died during the Dark Cycle')).length,2);
  }
  const four=scenario(['breachborn','cadet','cadet','cadet','cadet','cadet']);four.p[4].alive=false;four.p[5].alive=false;
  assert.throws(()=>four.use(0,[1]),/five/);assert.equal(four.p[0].usedOnce,false);
});
test('different extra and collective targets each retain Sentinel or Warden protection',()=>{
  const s=scenario(['warden','sentinel','breachborn','cadet','cadet','cadet'],1);
  s.use(0,[3]);s.dawn();s.next();s.use(2,[1]);s.hunt(2,3);s.dawn();
  assert.equal(s.p[1].alive,true);assert.equal(s.p[1].sentinelUsed,true);assert.equal(s.p[3].alive,true);assert.deepEqual(s.room.lastDeaths,[]);
});
test('nightly delay forbids every past target, survives restoration, and resets on rematch',()=>{
  const s=scenario(['xenobiologist','forger','cadet','cadet','cadet','cadet'],1);
  s.use(0,[1]);s.use(1,[0]);s.dawn();assert.equal(s.p[1].usedOnce,false);s.next();
  assert.throws(()=>s.use(1,[0]),/eligible/);s.use(1,[2]);s.dawn();s.next();
  assert.throws(()=>s.use(1,[0]),/eligible/);assert.throws(()=>s.use(1,[2]),/eligible/);
  const saved=JSON.parse(JSON.stringify(s.room));ensureAvatars(saved);
  assert.deepEqual(saved.players[1].delayTargets,[s.p[0].id,s.p[2].id]);
  assert.ok(!abilityView(saved,saved.players[1],s.now()).targets.includes(s.p[0].id));
  s.pass(1);s.dawn();s.next();assert.throws(()=>s.use(1,[0]),/eligible/);
  s.room.phase='victory';s.command(0,'rematch');assert.deepEqual(s.p[1].delayTargets,[]);
});
test('dawn deaths reveal exact public cards only when configured',()=>{
  for(const reveal of [false,true]) {
    const s=scenario(['breachborn','cadet','cadet','cadet','cadet','cadet']);s.room.settings.reveal=reveal;
    s.use(0,[1]);s.hunt(0,2);s.dawn();const v=project(s.room,s.p[3].id);
    for(const id of v.lastDeaths) assert.equal(v.players.find(p=>p.id===id).role,reveal?'cadet':undefined);
  }
});

test('Assistant is passive, independent of Xenobiologist, and analyses only current attack deaths',()=>{
  const s=scenario(['assistant','hollow','cadet','cadet','cadet','cadet'],1);
  assert.equal(abilityView(s.room,s.p[0],s.now()).active,false);assert.throws(()=>s.use(0,[2]));
  s.dawn();assert.equal(s.texts(0),'No casualties to analyse.');
  s.next();s.hunt(1,2);s.dawn();assert.match(s.p[0].reports.at(-1).text,/No dark cycle casualty had a Hollow signature/);
  s.p[3].alive=false;s.p[3].deathPhase='execution';s.p[3].diedDay=s.room.day;
  s.next();s.dawn();assert.equal(s.p[0].reports.at(-1).text,'No casualties to analyse.');
});
test('Assistant analyses multiple deaths without identifying the Hollow and Thrall registers Crew',()=>{
  const s=scenario(['assistant','hollow','breachborn','cadet','cadet','cadet','cadet','cadet']);
  s.use(2,[3]);s.hunt(1,2);s.hunt(2,2);s.dawn();
  assert.equal(s.room.lastDeaths.length,2);assert.equal(s.texts(0),'At least one dark cycle casualty had a Hollow signature.');
  const t=scenario(['assistant','hollow','thrall','cadet','cadet','cadet']);t.hunt(1,2);t.dawn();assert.equal(t.texts(0),'No dark cycle casualty had a Hollow signature.');
});
test('Assistant jam/death withhold analysis and revived Assistants wait until next dark cycle',()=>{
  const jam=scenario(['assistant','jammer','cadet','cadet','cadet','cadet']);jam.use(1,[0]);jam.hunt(1,2);jam.dawn();assert.equal(jam.texts(0),'');
  const dead=scenario(['assistant','hollow','cadet','cadet','cadet','cadet']);dead.hunt(1,0);dead.dawn();assert.equal(dead.texts(0),'');
  const revived=scenario(['medic','hollow','assistant','cadet','cadet','cadet']);revived.p[2].alive=false;revived.p[2].diedDay=1;revived.use(0,[2]);revived.dawn();
  assert.equal(revived.p[2].alive,true);assert.ok(revived.p[2].reports.every(r=>r.kind!=='casualty-analysis'));revived.next();revived.dawn();assert.equal(revived.p[2].reports.at(-1).text,'No casualties to analyse.');
});
test('Assistant reports delay and intercept only on delivery, retaining observation cycle',()=>{
  const s=scenario(['assistant','forger','parasite','hollow','cadet','cadet','cadet','cadet']);
  s.use(1,[0]);s.use(2,[0]);for(const i of [1,2,3])s.hunt(i,4);s.dawn();
  assert.match(s.texts(0),/delayed/);assert.match(s.texts(2),/No eligible/);
  s.next();s.dawn();const report=s.p[0].reports.find(r=>r.kind==='casualty-analysis'&&r.day===2);assert.match(report.text,/No dark cycle casualty/);
});

test('Assistant casualty reports are copied by Parasite only when actually delivered',()=>{
  const s=scenario(['assistant','forger','parasite','hollow','cadet','cadet','cadet','cadet']);
  s.use(1,[0]);s.pass(2);for(const i of [1,2,3])s.hunt(i,4);s.dawn();
  s.next();s.use(2,[0]);s.dawn();
  assert.match(s.texts(2),/Observed cycle 2: No dark cycle casualty had a Hollow signature/);
  assert.match(s.texts(2),/Observed cycle 3: No casualties to analyse/);
});
