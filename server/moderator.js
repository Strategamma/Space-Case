import { randomInt, randomUUID } from 'node:crypto';
import { poolError, candidateDeals, dealStrength } from '../public/setup.js';
import { ROLES, isHollow, canHunt, scansAsHollow } from '../public/roles.js';

const playing = room => room.players.filter(p => p.playing);
const living = room => playing(room).filter(p => p.alive);
function shuffle(cards, choose) {
  for (let i = cards.length - 1; i > 0; i--) { const j = choose(i + 1); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
}
// Provisional information-strength model, not an estimated win probability.
// Conditional roles contribute only when their enabling card is actually dealt.
export function dealWeight(cards) {
  const n=cards.length, s=dealStrength(cards), evil=cards.filter(isHollow).length;
  const target=Math.max(1,Math.min(Math.floor(n/3),(n+s.information+s.defence+s.recovery-s.disruption-2*s.lethality)/5));
  return Math.max(1,Math.round(100/(1+4*(evil-target)**2)));
}
export function dealPool(count, roles, choose = randomInt, spareCards=3) {
  const error = poolError(count, roles, false, spareCards); if (error) throw new Error(error);
  const {cards,deals}=candidateDeals(count,roles,spareCards);
  const validUnused=deals.map(({indices,assigned})=>({indices,weight:dealWeight(assigned)}));
  if (!validUnused.length) throw new Error('This pool cannot produce a balanced voyage.');
  let ticket = choose(validUnused.reduce((sum, candidate) => sum + candidate.weight, 0));
  let selected = validUnused[validUnused.length - 1];
  for (const candidate of validUnused) { ticket -= candidate.weight; if (ticket < 0) { selected = candidate; break; } }
  const unused = new Set(selected.indices);
  return { assigned: shuffle(cards.filter((_, i) => !unused.has(i)), choose), unused: cards.filter((_, i) => unused.has(i)) };
}
export const report = (sender, recipient, day, kind, text, investigative=false, timing=day===0?'character reveal':'before attack') => ({ id:randomUUID(), key:`${day}:${kind}:${sender.id}:${recipient.id}`, day, kind, text, recipient:recipient.id, investigative, timing });
export function startingReports(room) {
  const seats = playing(room), notes = [], xen = seats.find(p => p.role === 'xenobiologist');
  for (const p of seats) {
    if (canHunt(p.role)) notes.push(report(p, p, 0, 'hollow-network', `Hollow crew: ${seats.filter(q => canHunt(q.role)).map(q => q.name).join(', ')}. Your network is private.`));
    if (p.role === 'oracle') notes.push(report(p,p,0,'unused',`Unused cards: ${(room.unused || []).map(key=>ROLES[key].name).join(', ')}.`));
    if (p.role === 'observer') notes.push(report(p,p,0,'observatory',xen ? `Xenobiologist: ${xen.name}.` : 'No Xenobiologist was assigned on this voyage.'));
  }
  return notes;
}
export function nightReports(room) {
  const notes = [], seats = living(room);
  for (const p of seats) {
    const ids = room.nightChoices[p.id] ?? [], targets = ids.map(id => seats.find(q => q.id === id));
    if (targets.some(p => !p)) continue;
    if (p.role === 'xenobiologist' && targets[0]) {
      const target = targets[0]; notes.push(report(p,p,room.day,'scan',`${target.name}: ${scansAsHollow(target.role) ? 'Hollow signature detected' : 'no Hollow signature'}.`));
    }
    if (p.role === 'analyst' && targets.length === 2) notes.push(report(p,p,room.day,'analysis',`${targets.map(q => q.name).join(' + ')}: ${targets.some(q => scansAsHollow(q.role)) ? 'at least one Hollow signature' : 'no Hollow signatures'}.`));
    if (p.role === 'beacon' && room.day === 1 && targets[0]) notes.push(report(p,targets[0],1,'beacon',`${p.name} is the Beacon Operator. Loyal Crew confirmed.`));
  }
  return notes;
}
export function deliverReports(room, notes) {
  const delivered=[];
  for (const note of notes) {
    const recipient=room.players.find(p=>p.id===note.recipient);
    if(!recipient?.playing||!recipient.alive) continue;
    recipient.reportKeys ??= [];
    const key=note.key||note.id;
    if(recipient.reportKeys.includes(key)||recipient.reports.some(r=>r.id===note.id)) continue;
    recipient.reportKeys.push(key);
    const {id,day,kind,text,timing}=note;
    recipient.reports.push({id,day,kind,text,timing});
    delivered.push(note);
  }
  return delivered;
}
