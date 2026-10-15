import { ROLES, isHollow, canHunt } from './roles.js?v=1.0.0';

export const CARD_LIMITS = Object.fromEntries(Object.keys(ROLES).map(key => [key, key === 'cadet' ? 20 : key === 'hollow' ? 8 : key === 'engineer' ? 18 : 1]));
export const factionLimits = count => ({ minEvil: 1, maxEvil: Math.floor(count / 3), minGood: count - Math.floor(count / 3) });
export const poolSize = roles => Object.values(roles).reduce((sum, n) => sum + n, 0);
export const evilCount = roles => Object.entries(roles).reduce((sum,[key,n]) => sum + (isHollow(key) ? n : 0), 0);
export function dealStrength(cards) {
  const count = key => cards.filter(role => role === key).length, xen = count('xenobiologist');
  const information = 2*xen + 1.5*count('analyst') + (count('engineer')>1 ? .75*count('engineer'):0) + (xen ? count('observer'):0) + .75*count('assistant') + .75*count('beacon')
    + 1.5*count('resonance') + 1.5*count('proximity') + .75*count('surveyor') + count('auditor') + count('diver') + 2*count('cartographer') + .75*count('echo');
  const defence = count('warden') + count('sentinel') + .5*count('stasis');
  const recovery = count('medic');
  const disruption = count('jammer') + .5*count('dreadcaster') + .5*count('leech') + count('forger') + count('wardbreaker') + .5*count('thief') + .5*count('oracle') + .75*count('parasite');
  return { information, defence, recovery, disruption, lethality:count('breachborn') };
}
export function allowedDeal(cards) {
  const n=cards.length, evil=cards.filter(isHollow).length, {maxEvil}=factionLimits(n), strength=dealStrength(cards);
  if (evil<1 || evil>maxEvil || !cards.some(canHunt)) return false;
  const advanced=cards.some(key=>!['cadet','hollow','xenobiologist','analyst','engineer','observer','assistant','beacon'].includes(key));
  // Structural limits are deliberately conservative; these are not win-rate estimates.
  if (advanced && (strength.information<.75 || strength.information>n*.8 || strength.defence+strength.recovery>(n<8 ? 2 : 3))) return false;
  return true;
}
export function candidateDeals(count, roles, spareCards=3) {
  const cards=Object.entries(roles).flatMap(([key,n])=>Array(n).fill(key)), deals=[];
  if(![3,4,5].includes(spareCards)||cards.length!==count+spareCards) return {cards,deals};
  const visit=(start,indices)=>{
    if(indices.length===spareCards) {
      const unused=new Set(indices), assigned=cards.filter((_,i)=>!unused.has(i));
      if(allowedDeal(assigned)) deals.push({indices:[...indices],assigned});
      return;
    }
    for(let i=start;i<=cards.length-(spareCards-indices.length);i++)visit(i+1,[...indices,i]);
  };
  visit(0,[]); return {cards,deals};
}
export function suggestPool(count,spareCards=3) {
  const roles=Object.fromEntries(Object.keys(CARD_LIMITS).map(key=>[key,0]));
  roles.hollow=Math.max(2,Math.floor(count/4)); roles.xenobiologist=1; roles.warden=1; roles.resonance=1;
  if(count>=8){roles.hollow--;roles.jammer=1;roles.proximity=1;}
  if(count>=10)roles.medic=1;
  if(count>=12)roles.cartographer=1;
  roles.cadet=count+spareCards-poolSize(roles); return roles;
}
export function randomPool(count,spareCards=3,reveal=true,choose=size=>Math.floor(Math.random()*size)) {
  if(!Number.isInteger(count)||count<6||count>15||![3,4,5].includes(spareCards)) throw new Error('Choose 6–15 players and 3–5 backup cadets.');
  const shuffle=items=>{for(let i=items.length-1;i>0;i--){const j=choose(i+1);[items[i],items[j]]=[items[j],items[i]];}return items;};
  for(let attempt=0;attempt<32;attempt++) {
    const roles=Object.fromEntries(Object.keys(CARD_LIMITS).map(key=>[key,0]));
    const evil=Math.min(factionLimits(count).maxEvil+1,Math.max(2,Math.floor(count/4)+choose(2)));
    roles.hollow=1;roles.xenobiologist=1;
    for(let i=1;i<evil;i++){
      const options=Object.keys(ROLES).filter(key=>isHollow(key)&&roles[key]<CARD_LIMITS[key]);
      roles[options[choose(options.length)]]++;
    }
    let slots=Math.min(count+spareCards-evil-1,Math.max(2,Math.floor(count/2)));
    const crew=shuffle(Object.keys(ROLES).filter(key=>!isHollow(key)&&!['cadet','xenobiologist'].includes(key)&&(!reveal||!['auditor','assistant'].includes(key))));
    for(const key of crew){const n=key==='engineer'?2:1;if(n>slots)continue;roles[key]=n;slots-=n;if(!slots)break;}
    roles.cadet=count+spareCards-poolSize(roles);
    if(!poolError(count,roles,reveal,spareCards))return roles;
  }
  return suggestPool(count,spareCards);
}
export function poolError(count, roles, reveal = false, spareCards=3) {
  if(![3,4,5].includes(spareCards)) return 'Choose 3, 4 or 5 backup cadets.';
  if (reveal && (roles?.auditor||roles?.assistant)) return 'Tribunal Auditor and Research Assistant require public character reveals to be off. Remove these cards or disable reveal characters on death.';
  if (!Number.isInteger(count) || count < 6 || count > 15) return 'Choose 6–15 playing crew members.';
  if (!roles || Object.keys(roles).some(key => !Object.hasOwn(CARD_LIMITS, key))) return 'Choose cards from the character library.';
  for (const [key,max] of Object.entries(CARD_LIMITS)) if (!Number.isInteger(roles[key]??0) || (roles[key]??0)<0 || (roles[key]??0)>max) return `Choose a valid number of ${ROLES[key].name} cards.`;
  if (poolSize(roles)!==count+spareCards) return `Select exactly ${count+spareCards} cards for ${count} players plus ${spareCards} backup cadets.`;
  if (roles.engineer===1) return 'Select zero or at least two Linked Engineer cards for the possible pool.';
  if (roles.observer&&!roles.xenobiologist) return 'Include a possible Xenobiologist when selecting the Observatory Officer.';
  const evil=evilCount(roles), {maxEvil,minGood}=factionLimits(count);
  if(evil<1) return 'Include at least one Hollow card.';
  if(!Object.entries(roles).some(([key,n])=>n>0&&canHunt(key))) return 'Include a Hollow network character; Thrall cannot provide the collective attack.';
  if(evil>maxEvil+spareCards||poolSize(roles)-evil<minGood) return `A valid deal needs at least ${minGood} loyal Crew and 1–${maxEvil} Hollow.`;
  if(!candidateDeals(count,roles,spareCards).deals.length) return 'This pool has no legal strength mix. Include operative Crew information and reduce stacked information, defence or recovery.';
  return null;
}

export function togglePoolRole(key, count, remaining = Infinity) {
  const added = key === 'engineer' ? 2 : 1;
  return count > 0 ? 0 : remaining >= added ? added : 0;
}
export function adjustPoolCopies(key, count, direction, remaining = Infinity) {
  if (!count) return 0;
  if (direction > 0 && remaining < direction) return count;
  return Math.max(key === 'engineer' ? 2 : 1, Math.min(CARD_LIMITS[key], count + direction));
}
