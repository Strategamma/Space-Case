import { randomBytes, randomUUID } from 'node:crypto';
import { ROLES, DEFAULT_SETTINGS, isHollow, canHunt, powerRole } from '../public/roles.js';
import { CARD_LIMITS, poolError, crewPoolError, suggestCrewPool, factionLimits } from '../public/setup.js';
import { dealPool, dealAutomaticHollow, startingReports, deliverReports } from './moderator.js';
import { initAbilities, openNight, resolveAbilities, abilityView, huntView, submitAbility, submitHunt } from './abilities.js';
import { AVATARS } from '../public/avatars.js';

const fail = message => { throw new Error(message); };
export const crew = room => room.players.filter(p => p.playing);
const living = room => crew(room).filter(p => p.alive);
const player = (room, id) => room.players.find(p => p.id === id) ?? fail('Cadet not found.');
const log = (room, text) => room.log.push({ id: randomUUID(), text, day: room.day });
const requirePhase = (room, ...phases) => { if (!phases.includes(room.phase)) fail('That action is not available in this phase.'); };
const requireCaptain = (room, id) => { if (room.host !== id) fail('Only the Captain can do that.'); };
const requireLiving = (room, id) => { const p = player(room, id); if (!p.playing || !p.alive) fail('Only living crew may do that.'); return p; };
export function syncLobby(room) {
  if (room.phase !== 'lobby') return;
  const count = crew(room).length;
  const roles = room.settings.roles;
  const others = Object.entries(roles).reduce((sum,[key,n]) => sum + (key === 'cadet' ? 0 : n),0);
  roles.cadet = Math.max(0, Math.max(6,count) + 3 - others);
  room.settings.playerCount = count;
  room.settings.spareCards = 3;
}
function automaticSetup(room) {
  const count = Math.max(6,crew(room).length);
  const roles={...Object.fromEntries(Object.keys(ROLES).map(key=>[key,0])),...room.settings.roles};
  for(const key of Object.keys(roles)) if(isHollow(key)) roles[key]=0;
  room.settings={...room.settings,automaticHollow:true,spareCards:3,roles};
  syncLobby(room);
  if(crewPoolError(count,roles,room.settings.reveal,3)) room.settings.roles=suggestCrewPool(count,3);
}
export function ensureAvatars(room) {
  room.settings.roles = {...Object.fromEntries(Object.keys(ROLES).map(key=>[key,0])),...room.settings.roles};
  initAbilities(room);
  if(room.phase==='lobby'&&!room.settings.automaticHollow)automaticSetup(room);
  syncLobby(room);
  room.settings.spareCards ??= 3;
  room.settings.playerCount ??= Math.max(6, crew(room).length);
  room.settings.roles.cadet ??= Math.max(0, room.settings.playerCount + room.settings.spareCards - Object.values(room.settings.roles).reduce((a,b) => a+b, 0));
  room.unused ??= []; room.matchId ??= room.log[0]?.id || randomUUID();
  const used = new Set();
  for (const p of room.players) {
    p.revealed ??= !!p.acknowledged || !['lobby','orders'].includes(room.phase);
    if (!Number.isInteger(p.avatar) || !AVATARS[p.avatar] || used.has(p.avatar)) p.avatar = AVATARS.findIndex((_, i) => !used.has(i));
    used.add(p.avatar);
  }
}
export function addPlayer(room, name, playing = true, avatar) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 32) fail('Choose a callsign of 1–32 characters.');
  if (playing && crew(room).length >= 15) fail('All fifteen berths are occupied.');
  if (avatar === undefined) avatar = AVATARS.findIndex((_, i) => !room.players.some(p => p.avatar === i));
  if (!Number.isInteger(avatar) || !AVATARS[avatar]) fail('Choose a valid crew avatar.');
  if (room.players.some(p => p.avatar === avatar)) fail('That avatar was just claimed. Choose another crew avatar.');
  const p = { id: randomUUID(), token: randomBytes(32).toString('hex'), name: name.trim(), avatar, playing, online: true, alive: true, score: 0, role: null, reports: [], revealed: false, acknowledged: false };
  room.players.push(p); syncLobby(room); return p;
}
export function createRoom(name, avatar) {
  const room = { code: randomBytes(3).toString('hex').toUpperCase(), host: null, players: [], settings: structuredClone(DEFAULT_SETTINGS), phase: 'lobby', day: 0, log: [], deadline: null, pause: null, consent: [], votes: {}, nomination: null, nominations: [], block: null, high: 0, tied: false, nightChoices: {}, lockedTarget: null, winner: null, lastDeaths: [] };
  room.host = addPlayer(room, name, true, avatar).id; return room;
}
function validateSettings(room, next) {
  if (typeof next.playing !== 'boolean' || typeof next.reveal !== 'boolean') fail('Invalid Captain or reveal setting.');
  if (![120, 180, 300, 420, 600].includes(next.discussion) || ![30, 45, 60, 90].includes(next.night)) fail('Choose a supported timer.');
  if(!next.roles||Object.keys(next.roles).some(key=>!Object.hasOwn(ROLES,key))) fail('Invalid duty roster.');
  const roles = {};
  for (const key of Object.keys(DEFAULT_SETTINGS.roles)) {
    const n = next.roles?.[key] ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > CARD_LIMITS[key]) fail('Invalid duty roster.');
    roles[key] = n;
  }
  if (roles.engineer === 1) fail('Linked Engineers need at least two candidate cards, or zero.');
  if (roles.observer && !roles.xenobiologist) fail('The Observatory Officer needs a possible Xenobiologist.');
  const count = crew(room).length + (next.playing ? 1 : 0) - (player(room, room.host).playing ? 1 : 0);
  if (count > 15) fail('All fifteen berths are occupied.');
  if(count!==crew(room).length && Object.values(roles).reduce((a,b)=>a+b,0)===Math.max(6,crew(room).length)+3) roles.cadet=Math.max(0,roles.cadet+Math.max(6,count)-Math.max(6,crew(room).length));
  if (next.spareCards !== undefined && next.spareCards !== 3) fail('Voyages use exactly 3 extra candidates.');
  const error = crewPoolError(Math.max(6,count), roles, next.reveal, 3); if (error) fail(error);
  return { automaticHollow:true, playerCount: count, spareCards:3, playing: next.playing, reveal: next.reveal, discussion: next.discussion, night: next.night, roles };
}
function tallyBallot(room) {
  if(room.nomination?.result) return;
  const eligible=room.eligibleVoters || living(room).map(p=>p.id);
  if(eligible.some(id=>!(id in room.votes))) return;
  const yes = Object.values(room.votes).filter(Boolean).length, threshold = Math.max(1,Math.ceil(eligible.length / 2));
  if (yes >= threshold && yes >= room.high) {
    if (yes === room.high) { room.block = null; room.tied = true; }
    else { room.high = yes; room.block = room.nomination.to; room.tied = false; }
  }
  const outcome = yes < threshold ? 'below-threshold' : room.block === room.nomination.to ? 'on-block' : yes === room.high && room.tied ? 'tied' : 'lower-total';
  const result = {yes, spare:eligible.length-yes, total:eligible.length, threshold, outcome, block:room.block, high:room.high, tied:room.tied};
  room.nomination.result=result;
  const n = { ...room.nomination, yes, total: eligible.length }; room.nominations.push(n);
  log(room, `${player(room, n.from).name} nominated ${player(room, n.to).name}: ${yes}/${n.total} voted Execute. ${room.tied ? 'Highest vote tied; nobody is on the block.' : room.block === n.to ? 'Nominee is on the block.' : 'Block unchanged.'}`);
}
function resetDay(room, now) {
  room.phase = 'discussion'; room.deadline = now + room.settings.discussion * 1000;
  room.nominations = []; room.nomination = null; room.votes = {}; room.block = null; room.high = 0; room.tied = false;
}
function win(room) {
  if(room.phase==='victory') return true;
  const alive = living(room), h = alive.filter(p => isHollow(p.role)).length;
  const result = h === 0 ? 'crew' : h >= alive.length - h ? 'hollow' : null;
  if (!result) return false;
  room.phase = 'victory'; room.winner = result; room.deadline = null;
  for (const p of crew(room)) if (ROLES[p.role].team === result) p.score++;
  log(room, result === 'crew' ? 'Anomaly contained. The Crew have reclaimed the ship.' : 'Containment lost. The Hollow control the ship.');
  return true;
}
function startNight(room, now) {
  room.phase = 'night'; room.day++; room.deadline = now + room.settings.night * 1000; room.nightChoices = {}; room.lockedTarget = null; room.lastDeaths = [];
  openNight(room);
  log(room, `Dark Cycle ${room.day}. Attend privately to your station.`);
}
export function adjacent(room, id) {
  const seats = crew(room), i = seats.findIndex(p => p.id === id);
  return [seats[(i + seats.length - 1) % seats.length], seats[(i + 1) % seats.length]].filter(p => p?.alive).map(p => p.id);
}
function resolveNight(room, now) {
  const result=resolveAbilities(room);
  room.lastDeaths=result.deaths;
  for(const id of result.deaths) log(room,`${player(room,id).name} died during the Dark Cycle.`);
  for(const p of living(room)) {
    if(p.status?.mute) log(room,`${p.name}: speech restricted until the next Dark Cycle.`);
    if(p.status?.noVote) log(room,`${p.name}: voting suspended until the next Dark Cycle.`);
  }
  for(const id of result.revived) log(room,`${player(room,id).name} returned to life.`);
  if(room.day>1&&!result.deaths.length) log(room,'Light cycle arrives. No crew member died.');
  room.executionRecord=null;
  if (!win(room)) { resetDay(room, now); log(room, `Light cycle ${room.day}. Emergency Assembly is open.`); }
}
export function tick(room, now = Date.now()) {
  if (room.pause || !room.deadline || now < room.deadline) return false;
  if (room.phase === 'night') resolveNight(room, now);
  else if (room.phase === 'discussion') { room.phase = 'nominations'; room.deadline = null; log(room, 'Discussion ended. Nominations are open.'); }
  else return false;
  return true;
}
export function act(room, id, action, data = {}, now = Date.now()) {
  const me = player(room, id);
  initAbilities(room);
  if (room.pause && action !== 'consent') fail('The voyage is paused. Wait for reconnection or agree to a new Captain.');
  switch (action) {
    case 'remove': {
      requireCaptain(room, id); requirePhase(room, 'lobby');
      const target = player(room, data.id);
      if (target.id === room.host) fail('The Captain cannot remove their own berth.');
      room.players = room.players.filter(p => p.id !== target.id); syncLobby(room); break;
    }
    case 'move-seat': {
      requireCaptain(room, id); requirePhase(room, 'lobby');
      if (![ -1, 1 ].includes(data.direction)) fail('Choose a valid seat direction.');
      const seats=crew(room), index=seats.findIndex(p=>p.id===data.id), other=index+data.direction;
      if(index<0||other<0||other>=seats.length) fail('That berth cannot move in that direction.');
      const a=room.players.indexOf(seats[index]), b=room.players.indexOf(seats[other]);
      [room.players[a],room.players[b]]=[room.players[b],room.players[a]];
      break;
    }
    case 'settings': {
      requireCaptain(room, id); requirePhase(room, 'lobby');
      room.settings = validateSettings(room, data); me.playing = data.playing; syncLobby(room); break;
    }
    case 'start': {
      requireCaptain(room, id); requirePhase(room, 'lobby');
      const seats = crew(room);
      if (seats.length < 6 || seats.length > 15) fail('You need 6–15 crew members to launch.');
      syncLobby(room);
      if (seats.some(p => !p.online)) fail('Wait for all crew members to reconnect.');
      const error=(room.settings.automaticHollow?crewPoolError:poolError)(seats.length,room.settings.roles,room.settings.reveal,room.settings.spareCards??3); if(error) fail(error);
      const deal = (room.settings.automaticHollow?dealAutomaticHollow:dealPool)(seats.length, room.settings.roles,undefined,room.settings.spareCards??3);
      room.unused = deal.unused; room.matchId=randomUUID(); room.resolvedCycle=0; room.deferredReports=[]; room.specialChoices={}; room.executionRecord=null;
      seats.forEach((p, i) => { p.role = deal.assigned[i]; p.alive = true; p.revealed = false; p.acknowledged = false; p.reports = []; p.inherited = false; delete p.echoRole; delete p.echoPending; p.echoSpent=false; p.delayTargets=[]; p.usedOnce=false; p.sentinelUsed=false; p.status={}; p.reportKeys=[]; delete p.boundId; delete p.lastDread; delete p.diedDay; delete p.deathPhase; });
      deliverReports(room, startingReports(room));
      room.phase = 'orders'; room.log = []; room.day = 0; room.winner = null; room.winnerId = null; room.lastDeaths = []; log(room, 'Sealed orders distributed. Open them privately.'); break;
    }
    case 'reveal':
      if (['lobby'].includes(room.phase) || !me.playing || !me.role) fail('No sealed character is available.');
      me.revealed = true; break;
    case 'acknowledge':
      requirePhase(room, 'orders'); requireLiving(room, id);
      if (!me.revealed) fail('Open your sealed character before acknowledging orders.');
      me.acknowledged = true;
      if(crew(room).every(p=>p.acknowledged&&p.online)&&player(room,room.host).online) startNight(room,now);
      break;
    case 'night': {
      requireCaptain(room, id); requirePhase(room, 'orders', 'aftermath');
      if (room.phase === 'orders' && crew(room).some(p => !p.acknowledged)) fail('Every crew member must acknowledge their sealed orders.');
      startNight(room, now); break;
    }
    case 'ability': submitAbility(room,me,data,now); break;
    case 'hunt': submitHunt(room,me,data,now); break;
    case 'station': {
      requirePhase(room,'night');
      // Compatibility for saved clients; all paths still use authoritative windows.
      if(isHollow(me.role)&&room.day>1) submitHunt(room,me,data,now);
      else submitAbility(room,me,data,now);
      break;
    }
    case 'nominations': requireCaptain(room, id); requirePhase(room, 'discussion'); room.phase = 'nominations'; room.deadline = null; log(room, 'Nominations are open.'); break;
    case 'extend': requireCaptain(room, id); requirePhase(room, 'discussion'); room.deadline += 60_000; break;
    case 'nominate': {
      requireCaptain(room, id); requirePhase(room, 'nominations');
      const from = requireLiving(room, data.from), to = requireLiving(room, data.to);
      if (room.nominations.some(n => n.from === from.id)) fail('That crew member has already nominated this light cycle.');
      if (room.nominations.some(n => n.to === to.id)) fail('That crew member has already been nominated this light cycle.');
      room.eligibleVoters=living(room).filter(p=>!p.status?.noVote).map(p=>p.id);
      if(!room.eligibleVoters.length) fail('No eligible voters remain. Close nominations without execution.');
      room.nomination = { from: from.id, to: to.id }; room.votes = {}; room.phase = 'voting'; break;
    }
    case 'vote': requirePhase(room, 'voting'); requireLiving(room, id); if (!(room.eligibleVoters || living(room).map(p=>p.id)).includes(id)) fail('Your voting is suspended for this light cycle.'); if (typeof data.execute !== 'boolean') fail('Choose Execute or Spare.'); if (id in room.votes) fail('Your ballot is already sealed.'); room.votes[id] = data.execute; tallyBallot(room); break;
    case 'closeVote': {
      requireCaptain(room, id); requirePhase(room, 'voting');
      const eligible=room.eligibleVoters || living(room).map(p=>p.id);
      if (eligible.some(id=>!(id in room.votes))) fail('Wait for every living eligible crew member to vote.');
      tallyBallot(room);
      room.nomination = null; room.votes = {}; room.phase = 'nominations'; break;
    }
    case 'execute': {
      requireCaptain(room, id); requirePhase(room, 'nominations'); room.lastDeaths = [];
      if (room.block) {
        const q=player(room,room.block);
        if(q.status?.stasis===room.day&&living(room).length>=5) log(room,`Execution completed. ${q.name} survived.`);
        else {
          q.alive=false; q.diedDay=room.day; q.deathPhase='execution'; room.executionRecord={id:q.id,role:q.role,day:room.day}; room.lastDeaths=[q.id]; log(room,`${q.name} was executed by Emergency Tribunal.`);
          // A future light-cycle blocker may set this private status; night jamming never does.
          if(q.role==='martyr'&&!q.status?.abilityBlocked) {
            room.phase='victory'; room.winner='martyr'; room.winnerId=q.id; room.deadline=null; q.score++;
            log(room,`${q.name}, The Martyr, claimed the tribunal. Only The Martyr wins.`);
          }
        }
      }
      else log(room, 'Tribunal closed. No execution this light cycle.');
      room.block = null;
      if (!win(room)) { room.phase = 'aftermath'; room.deadline = null; } break;
    }
    case 'rematch': {
      requireCaptain(room, id); requirePhase(room, 'victory');
      room.unused = []; room.phase = 'lobby'; room.deadline = null; room.day = 0; room.log = []; room.winner = null; room.winnerId = null; room.block = null; room.lastDeaths = [];
      for (const p of room.players) { p.role = null; p.alive = true; p.reports = []; p.revealed = false; p.acknowledged = false; p.inherited = false; delete p.echoRole; delete p.echoPending; p.echoSpent=false; p.delayTargets=[]; p.usedOnce=false; p.sentinelUsed=false; p.status={}; p.reportKeys=[]; delete p.boundId; delete p.lastDread; delete p.diedDay; delete p.deathPhase; }
      room.deferredReports=[]; room.specialChoices={}; room.resolvedCycle=0; room.executionRecord=null; automaticSetup(room); break;
    }
    case 'consent': {
      if (!room.pause || room.pause.reason !== 'captain') fail('Captain succession is not available.');
      if (!me.online) fail('Reconnect first.');
      if (!room.consent.includes(id)) room.consent.push(id);
      const online = room.players.filter(p => p.online && p.playing);
      if (online.length && online.every(p => room.consent.includes(p.id))) {
        room.host = online[0].id; const remaining = room.pause.remaining;
        room.settings.playing = online[0].playing; syncLobby(room);
        room.pause = ['night','voting'].includes(room.phase) && living(room).some(p => !p.online) ? { reason: 'connection', remaining } : null;
        room.consent = []; if (remaining !== null) room.deadline = now + remaining;
        log(room, `${online[0].name} accepted command with the connected crew’s agreement.`);
      }
      break;
    }
    default: fail('Unknown command.');
  }
}
export function connection(room, id, online, now = Date.now()) {
  player(room, id).online = online;
  if (!online && (id === room.host || (['night','voting'].includes(room.phase) && player(room, id).alive && player(room, id).playing))) {
    if (!room.pause) room.pause = { reason: id === room.host ? 'captain' : 'connection', remaining: room.deadline ? Math.max(0, room.deadline - now) : null };
    else if (id === room.host) room.pause.reason = 'captain';
    room.consent = [];
  }
  if(room.phase==='orders'&&crew(room).every(p=>p.acknowledged&&p.online)&&player(room,room.host).online) startNight(room,now);
  if (room.pause && player(room, room.host).online && (!['night','voting'].includes(room.phase) || living(room).every(p => p.online))) {
    const remaining = room.pause.remaining; room.pause = null; room.consent = []; if (remaining !== null) room.deadline = now + remaining;
  }
}
export function project(room, id) {
  initAbilities(room);
  const me = player(room, id), captain = room.host === id, overseer = captain && !me.playing;
  const reveal = p => room.phase === 'victory' || (!p.alive && room.settings.reveal) || overseer;
  const hollow = me.revealed && me.alive && canHunt(me.role) && room.phase !== 'lobby';
  return {
    code: room.code, matchId:room.matchId, host: room.host, phase: room.phase, day: room.day, settings: room.settings, deadline: room.deadline, serverNow: Date.now(), pause: room.pause ? { reason: room.pause.reason } : null, consent: room.consent,
    players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, playing: p.playing, online: p.online, alive: p.alive, score: p.score, acknowledged: room.phase === 'orders' ? p.acknowledged : undefined, muted:room.phase!=='night'&&!!p.status?.mute&&p.alive, noVote:room.phase!=='night'&&!!p.status?.noVote&&p.alive, role: reveal(p) ? p.role : undefined })),
    me: { id, playing: me.playing, alive: me.alive, powerRole:me.revealed?powerRole(me):null, echo:me.revealed&&me.role==='echo'?{spent:!!me.echoSpent,role:me.echoRole||(me.alive?me.echoPending?.role:null)||null,pending:me.alive&&!!me.echoPending}:undefined, role: me.revealed || room.phase === 'victory' ? me.role : null, revealed: !!me.revealed, inherited: me.inherited, reports: me.revealed ? me.reports : [], acknowledged: me.acknowledged, stationSubmitted: !!room.nightChoices[id], ballot: id in room.votes ? room.votes[id] : null, adjacent: adjacent(room, id), eligibleVote:me.alive&&!(me.status?.noVote), orders: { ability:abilityView(room,me), hunt:huntView(room,me), usedOnce:me.revealed&&me.alive?me.usedOnce:undefined, defenceSpent:me.revealed&&me.alive&&powerRole(me)==='sentinel'?me.sentinelUsed:undefined, boundName:me.revealed&&me.alive&&me.boundId?player(room,me.boundId).name:null, restrictions:me.alive?{mute:!!me.status.mute,noVote:!!me.status.noVote}:{} } },
    hollow: hollow ? { members: living(room).filter(p => canHunt(p.role)).map(p => ({ id: p.id, target: room.phase === 'night' ? room.nightChoices[p.id]?.[0] ?? null : null })), lockedTarget: room.phase === 'night' ? room.lockedTarget : null } : null,
    balance: factionLimits(room.settings.playerCount), unused: overseer || room.phase === 'victory' ? room.unused ?? [] : undefined,
    log: room.log.slice(-50), nomination: room.nomination, nominations: room.nominations, block: room.block, high: room.high, tied: room.tied, eligibleCount:room.phase==='voting'?(room.eligibleVoters||living(room).map(p=>p.id)).length:living(room).filter(p=>!p.status?.noVote).length, votesCast: Object.keys(room.votes).length, winner: room.winner, winnerId:room.phase==='victory'?room.winnerId:undefined, lastDeaths: room.lastDeaths
  };
}
