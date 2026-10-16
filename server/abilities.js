import { ROLES, isHollow, canHunt, scansAsHollow, powerRole } from '../public/roles.js';
import { resolutionRank } from '../public/script.js';
import { report, deliverReports } from './moderator.js';

const seats = room => room.players.filter(p=>p.playing);
const living = room => seats(room).filter(p=>p.alive);
const find = (room,id) => room.players.find(p=>p.id===id);
const fail = text => { throw new Error(text); };
export function initAbilities(room) {
  room.specialChoices ??= {}; room.deferredReports ??= []; room.resolvedCycle ??= 0;
  for(const p of room.players) { p.delayTargets ??= []; p.usedOnce ??= false; p.sentinelUsed ??= false; p.status ??= {}; p.reportKeys ??= []; }
}
export function neighbours(room,id,skipDead=false) {
  const all=seats(room), i=all.findIndex(p=>p.id===id), result=[];
  for(const direction of [-1,1]) for(let step=1;step<all.length;step++) {
    const p=all[(i+direction*step+all.length)%all.length];
    if(!skipDead || p.alive) { if(!result.includes(p.id)) result.push(p.id); break; }
  }
  return result;
}
function disabled(reason) { return { active:false, reason, targets:[], count:0, modes:[] }; }
export function abilityView(room,p,now=Date.now()) {
  if(!p.playing||!p.revealed||!p.role) return disabled('Reveal your character privately to receive your briefing.');
  if(!p.alive) return disabled('Signal lost. Your previous information is read-only.');
  if(!p.online) return disabled('Reconnect your terminal before issuing orders.');
  const key=powerRole(p), role=ROLES[key], spec=role.action;
  if(room.phase==='victory') return disabled('Voyage complete. All abilities are closed.');
  if(spec?.once&&p.usedOnce) return disabled('Your once-per-voyage ability has been spent.');
  if((key==='beacon'||key==='warden')&&(room.day>1||(room.day===1&&room.phase!=='night'))) return disabled(key==='warden'?'Your first dark cycle ward link is fixed.':'Your first dark cycle transmission window has ended.');
  if(key==='sentinel'&&p.sentinelUsed) return disabled('Your hull defence is depleted. There is no active dark cycle selection.');
  if(room.phase!=='night') return disabled(spec?'Dark cycle actions open during the next dark cycle. '+role.timing:role.timing);
  if(room.pause||now>=room.deadline) return disabled(room.pause?'Voyage paused. Wait for the uplink.':'Orders closed. Await light cycle.');
  if(canHunt(p.role)&&room.lockedTarget) return disabled('Consensus sealed. All Hollow orders are locked.');
  if(!spec) return disabled('No target selection for this character. '+role.timing);
  if(key==='medic'&&room.day<2) return disabled('Revival opens from the second dark cycle.');
  if(key==='breachborn'&&(room.day<2||living(room).length<5)) return disabled('Extra attack requires dark cycle two or later and at least five living players.');
  const eligible=seats(room).filter(q=>{
    if(!spec.self&&q.id===p.id) return false;
    if(spec.life==='dead'||spec.life==='recent') return !q.alive&&(spec.life!=='recent'||q.diedDay===room.day-1);
    if(!q.alive) return false;
    if(spec.life==='crew'&&canHunt(q.role)) return false;
    if(spec.life==='adjacent'&&!neighbours(room,p.id).includes(q.id)) return false;
    if(key==='forger'&&p.delayTargets?.includes(q.id)) return false;
    if(key==='dreadcaster'&&p.lastDread?.day===room.day-1&&p.lastDread.target===q.id) return false;
    return true;
  }).map(q=>q.id);
  if(eligible.length<spec.count) return disabled('No eligible targets for this cycle.');
  const choice=(isHollow(p.role)?room.specialChoices:room.nightChoices)?.[p.id];
  return {active:true,count:spec.count,targets:eligible,modes:key==='arbiter'?['mute','noVote']:[],once:!!spec.once,title:role.name,reason:role.description,selection:Array.isArray(choice)?choice:choice?.targets||[],mode:choice?.mode||null,submitted:choice!==undefined,passed:!!choice?.pass};
}
export function huntView(room,p,now=Date.now()) {
  if(!p.playing||!p.alive||!p.revealed||!canHunt(p.role)||room.phase!=='night') return disabled('Collective attack is available only to living Hollow during the dark cycle.');
  if(!p.online) return disabled('Reconnect before issuing orders.');
  if(room.pause||now>=room.deadline) return disabled(room.pause?'Voyage paused.':'Orders closed. Await light cycle.');
  if(room.day===1) return disabled('First contact: no attacks on the first dark cycle.');
  if(room.lockedTarget) return {...disabled('Consensus sealed. Await light cycle.'),locked:true,selection:[room.lockedTarget]};
  const special=abilityView(room,p,now);
  if(special.active&&!Object.hasOwn(room.specialChoices,p.id)) return disabled('Submit or skip your special order before choosing the shared victim.');
  return {active:true,count:1,targets:seats(room).map(q=>q.id),modes:[],title:'Collective attack',reason:'Every living member of your Hollow network must select the same victim. Unanimity seals every Hollow order.',selection:room.nightChoices[p.id]||[],submitted:Object.hasOwn(room.nightChoices,p.id)};
}
export function submitAbility(room,p,data,now) {
  initAbilities(room);
  if(room.phase!=='night') fail('That action is not available in this phase.');
  if(!p.playing||!p.alive||!p.revealed||!p.online) fail('Only living crew with a revealed character may use their station.');
  if(room.pause||now>=room.deadline) fail('The station window has closed. Await light cycle.');
  if(canHunt(p.role)&&(room.lockedTarget||room.nightChoices[p.id]?.length)) fail('Clear your victim choice before editing special orders; sealed consensus cannot change.');
  const view=abilityView(room,p,now);
  if(!view.active) {
    if(ROLES[powerRole(p)].action) fail(view.reason);
    if(!Array.isArray(data.targets)||data.targets.length||data.mode) fail('Select 0 targets.');
    (isHollow(p.role)?room.specialChoices:room.nightChoices)[p.id]=[]; return;
  }
  const targets=data.targets;
  if(data.pass===true) {
    (isHollow(p.role)?room.specialChoices:room.nightChoices)[p.id]={targets:[],pass:true}; return;
  }
  if(!Array.isArray(targets)||targets.some(id=>typeof id!=='string')||new Set(targets).size!==targets.length) fail('Choose valid distinct station targets.');
  if(targets.length!==view.count) fail(`Select ${view.count} target${view.count===1?'':'s'}.`);
  if(targets.some(id=>!view.targets.includes(id))) fail('That crew member is not an eligible target.');
  if(view.modes.length&&!view.modes.includes(data.mode)) fail('Choose mute or suspend voting.');
  if(!view.modes.length&&data.mode!=null) fail('That station has no selectable mode.');
  const choice=data.mode?{targets:[...targets],mode:data.mode}:[...targets];
  (isHollow(p.role)?room.specialChoices:room.nightChoices)[p.id]=choice;
}
export function submitHunt(room,p,data,now) {
  const view=huntView(room,p,now);
  if(!view.active) fail(view.reason);
  if(data.pass===true) { room.nightChoices[p.id]=[]; return; }
  if(!p.online||!Array.isArray(data.targets)||data.targets.length!==1||!view.targets.includes(data.targets[0])) fail('Choose one player aboard.');
  room.nightChoices[p.id]=[data.targets[0]];
  if(living(room).filter(q=>canHunt(q.role)).every(q=>room.nightChoices[q.id]?.[0]===data.targets[0])) room.lockedTarget=data.targets[0];
}
export function openNight(room) {
  initAbilities(room); room.specialChoices={};
  for(const p of room.players) {
    p.status={};
    if(p.alive&&p.playing&&p.echoPending&&p.echoPending.day<=room.day) {
      const saved=p.echoPending; p.echoRole=saved.role; p.usedOnce=saved.usedOnce; p.sentinelUsed=saved.sentinelUsed; p.inherited=saved.inherited;
      if(saved.boundId) p.boundId=saved.boundId; else delete p.boundId;
      delete p.echoPending;
      deliverReports(room,[report(p,p,room.day,'echo-active',`Copied power active: ${ROLES[p.echoRole].name}. ${ROLES[p.echoRole].timing}`,false,'dark cycle start')]);
    }

  }
}
const choiceFor = (room,p) => {
  const choice=(isHollow(p.role)?room.specialChoices:room.nightChoices)[p.id];
  return Array.isArray(choice)?{targets:choice}:choice||{targets:[],pass:true};
};
export function resolveAbilities(room) {
  initAbilities(room);
  if(room.resolvedCycle>=room.day) return {deaths:[],revived:[]};
  const actors=living(room), byRole=role=>actors.find(p=>powerRole(p)===role), chosen=p=>p?choiceFor(room,p):{targets:[],pass:true};
  const target=p=>find(room,chosen(p).targets?.[0]);
  const jammer=byRole('jammer'), blocked=target(jammer)?.id;
  const effective=p=>p&&p.id!==blocked;
  const committed=new Set(), pending=[], wards=new Set(), suppressed=new Set(), delayed=new Set();
  const add=(p,recipient,kind,text,investigative=false,timing='before attack')=>pending.push(report(p,recipient,room.day,kind,text,investigative,timing));
  for(const warden of actors.filter(p=>powerRole(p)==='warden')) {
    if(room.day===1&&target(warden)) warden.boundId=target(warden).id;
    if(effective(warden)&&find(room,warden.boundId)?.alive) wards.add(warden.boundId);
  }
  for(const p of [...actors].sort((a,b)=>resolutionRank(powerRole(a),room.day===1)-resolutionRank(powerRole(b),room.day===1))) {
    if(!effective(p)) continue;
    const c=chosen(p), targets=(c.targets||[]).map(id=>find(room,id)), q=targets[0];
    const key=powerRole(p), hasAction=ROLES[key].action;
    if(hasAction?.once&&p.usedOnce) continue;
    if(hasAction&&(!q||c.pass)) continue;
    if(hasAction?.once) { p.usedOnce=true; committed.add(p.id); }
    if(key==='echo') {
      p.echoSpent=true;
      if(q.role==='echo'||ROLES[q.role]?.team!=='crew') add(p,p,'echo-copy','Nothing happened.',false,'dawn');
      else {
        p.echoPending={role:q.role,day:room.day+1,usedOnce:!!q.usedOnce,sentinelUsed:!!q.sentinelUsed,inherited:!!q.inherited,boundId:q.boundId||null};
        add(p,p,'echo-copy',`Copied power: ${ROLES[q.role].name}. Activates next dark cycle; spent resources are preserved.`,false,'dawn');
      }
    }
    if(key==='thrall') add(p,p,'thrall-scan',`${q.name}: ${q.role==='martyr'?'Independent allegiance':isHollow(q.role)?'Hollow allegiance':'Crew allegiance'}.`,true);
    if(key==='xenobiologist') add(p,p,'scan',`${q.name}: ${scansAsHollow(q.role)?'Hollow signature detected':'no Hollow signature'}.`,true);
    if(key==='engineer') {
      const matches=targets.filter(t=>t.role==='engineer');
      add(p,p,'engineer-diagnostic',matches.length?`Engineer match confirmed: ${matches.map(t=>t.name).join(', ')}.`:'Neither selected player is a Linked Engineer.',true);
    }
    if(key==='analyst') add(p,p,'analysis',`${targets.map(t=>t.name).join(' + ')}: ${targets.some(t=>scansAsHollow(t.role))?'at least one Hollow signature':'no Hollow signatures'}.`,true);
    if(key==='resonance') add(p,p,'resonance',`${targets.map(t=>t.name).join(' + ')}: ${scansAsHollow(targets[0].role)===scansAsHollow(targets[1].role)?'same allegiance':'different allegiances'}.`,true);
    if(key==='cartographer') add(p,p,'cartography',`${targets.map(t=>t.name).join(' + ')}: ${targets.filter(t=>scansAsHollow(t.role)).length} Hollow.`,true);
    if(key==='thief'||key==='diver') add(p,p,'record',`${q.name}: ${ROLES[q.role].name}.`,true);
    if(key==='beacon'&&room.day===1) add(p,q,'beacon',`${p.name} is the Beacon Operator. Loyal Crew confirmed.`);
    if(key==='warden'&&room.day===1) add(p,p,'ward',`Ward linked to ${q.name}.`);
    if(key==='wardbreaker') suppressed.add(q.id);
    if(key==='forger'&&!p.delayTargets.includes(q.id)) { delayed.add(q.id); p.delayTargets.push(q.id); }
    if(key==='stasis') { q.status.stasis=room.day; add(p,p,'stasis','Stasis field queued for the following light cycle.'); }
    if(key==='arbiter'||key==='dreadcaster'||key==='leech') {
      const mode=key==='arbiter'?c.mode:key==='dreadcaster'?'mute':'noVote';
      q.status[mode]=true;
      if(key==='dreadcaster') p.lastDread={day:room.day,target:q.id};
    }
    if(key==='auditor'&&room.day>1) add(p,p,'execution',room.executionRecord?`Executed this light cycle: ${find(room,room.executionRecord.id).name} — ${ROLES[room.executionRecord.role].name}.`:'No player died by execution this light cycle.',!!room.executionRecord);
    if(key==='surveyor'&&room.day===1) {
      const all=seats(room); const count=all.filter((p,i)=>scansAsHollow(p.role)&&scansAsHollow(all[(i+1)%all.length].role)).length;
      add(p,p,'survey',`Initial manifest: ${count} adjacent Hollow ${count===1?'pair':'pairs'}.`,true,'initial manifest');
    }
  }
  const deaths=[];
  const kill=p=> { if(!p?.alive) return; p.alive=false; p.diedDay=room.day; p.deathPhase='night'; deaths.push(p.id); };
  const breach=byRole('breachborn'), attacks=new Set();
  if(room.day>1) {
    if(room.lockedTarget) attacks.add(room.lockedTarget);
    if(actors.length>=5&&breach&&committed.has(breach.id)) attacks.add(target(breach)?.id);
  }
  // Shared victims receive one attack, so a second order cannot bypass a defence.
  for(const id of attacks) {
    const q=find(room,id);
    if(!q?.alive) continue;
    const defence=!suppressed.has(q.id);
    if(defence&&wards.has(q.id)) continue;
    if(defence&&powerRole(q)==='sentinel'&&effective(q)&&!q.sentinelUsed) {
      q.sentinelUsed=true; add(q,q,'defence','Hull defence absorbed an ordinary attack.',false,'dawn');
    } else kill(q);
  }
  const revived=[];
  const medics=actors.filter(p=>powerRole(p)==='medic'&&committed.has(p.id)&&p.alive&&target(p));
  for(const medic of medics) {
    const q=target(medic);
    if(!q.alive) {
      q.alive=true; q.status={}; revived.push(q.id);
      add(q,q,'restored','Life support restored. You may speak and vote this light cycle; your abilities resume next dark cycle.',false,'dawn');
    }
    add(medic,medic,'revival',`${q.name} revived.`,false,'dawn');
  }
  const casualties=deaths.map(id=>find(room,id));
  for(const assistant of actors.filter(p=>p.alive&&effective(p)&&powerRole(p)==='assistant')) {
    add(assistant,assistant,'casualty-analysis',casualties.length
      ? (casualties.some(p=>scansAsHollow(p.role))?'At least one dark cycle casualty had a Hollow signature.':'No dark cycle casualty had a Hollow signature.')
      : 'No casualties to analyse.',true,'after attacks and revival');
  }
  for(const p of actors.filter(p=>p.alive)) {
    if(effective(p)&&powerRole(p)==='proximity') {
      const ids=neighbours(room,p.id,true), others=ids.map(id=>find(room,id));
      add(p,p,'neighbours',`${others.map(q=>q.name).join(' + ')}: ${others.filter(q=>scansAsHollow(q.role)).length} Hollow among your living neighbours.`,true,'after deaths and revival');
    }
    if(p.status.mute) add(p,p,'mute','Speech restricted until the next dark cycle. You may still nominate and vote unless voting is separately suspended.',false,'dawn');
    if(p.status.noVote) add(p,p,'no-vote','Voting suspended until the next dark cycle. You may still speak unless separately muted, and you may nominate.',false,'dawn');
  }
  const due=room.deferredReports.filter(r=>r.due<=room.day);
  room.deferredReports=room.deferredReports.filter(r=>r.due>room.day);
  const activeIds=new Set(actors.map(p=>p.id));
  const ready=due.filter(note=>activeIds.has(note.recipient));
  for(const note of pending) {
    if(!find(room,note.recipient)?.alive) continue;
    if(note.investigative&&delayed.has(note.recipient)) {
      room.deferredReports.push({...note,due:room.day+1});
      const p=find(room,note.recipient);
      ready.push(report(p,p,room.day,'delayed',`Investigative transmission delayed until the light cycle ${room.day+1}.`,false,'dawn'));
    } else ready.push(note);
  }
  const delivered=deliverReports(room,ready);
  const parasite=byRole('parasite');
  if(parasite&&committed.has(parasite.id)&&parasite.alive) {
    const copied=delivered.filter(r=>r.recipient===target(parasite)?.id&&r.investigative);
    deliverReports(room,[report(parasite,parasite,room.day,'interception',copied.length?copied.map(r=>`Observed cycle ${r.day}: ${r.text}`).join('\n'):'No eligible transmission received.',false,'dawn')]);
  }
  room.resolvedCycle=room.day;
  return {deaths,revived};
}
