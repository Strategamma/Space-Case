import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogue, validateCharacters } from '../../scripts/validate-characters.mjs';
import { dealStrength } from '../../public/setup.js';

test('every main-list character has complete integration metadata',()=>{
  assert.deepEqual(validateCharacters(),[]);
});
test('an incomplete new character fails the release gate',()=>{
  const next=structuredClone(catalogue);
  next.roles.navigator={name:'Navigator',team:'crew',symbol:'scan',description:'Test fixture',timing:'Test timing'};
  const errors=validateCharacters(next);
  for(const registration of ['defaults','limits','balance','guides','order']) assert.ok(errors.includes(`navigator: missing ${registration} registration`));
});
test('the catalogue gate rejects broken guides, targets, schedules, dependencies and duplicate names',()=>{
  const next=structuredClone(catalogue);
  next.roles.analyst.name=next.roles.cadet.name;
  next.roles.analyst.action.life='unknown';
  next.guides.analyst['Resolution & interactions']=undefined;
  next.order.analyst.first=['invented-stage'];
  next.balance.analyst={information:-1,requires:{missing:1}};
  const errors=validateCharacters(next).join('\n');
  for(const failure of ['duplicate character name','invalid target life rule','incomplete guide','invalid first resolution schedule','invalid balance weight','invalid balance prerequisite']) assert.ok(errors.includes(failure),failure);
});
test('explicit balance registration preserves the original scoring model',()=>{
  const old=cards=>{
    const count=key=>cards.filter(k=>k===key).length,xen=count('xenobiologist');
    return {information:2*xen+1.5*count('analyst')+(count('engineer')>1?.75*count('engineer'):0)+(xen?count('observer'):0)+.75*count('assistant')+.75*count('beacon')+1.5*count('resonance')+1.5*count('proximity')+.75*count('surveyor')+count('auditor')+count('diver')+2*count('cartographer')+.75*count('echo'),defence:count('warden')+count('sentinel')+.5*count('stasis'),recovery:count('medic'),disruption:count('jammer')+.5*count('dreadcaster')+.5*count('leech')+count('forger')+count('wardbreaker')+.5*count('thief')+.5*count('oracle')+.75*count('parasite'),lethality:count('breachborn')};
  };
  const ids='cadet hollow xenobiologist analyst engineer observer assistant beacon resonance warden medic arbiter proximity surveyor auditor diver sentinel stasis cartographer jammer dreadcaster leech breachborn thief forger wardbreaker oracle parasite echo thrall'.split(' ');
  for(const id of ids) for(const partner of ids) for(const count of [1,2,3]) {
    const cards=[...Array(count).fill(id),partner];
    assert.deepEqual(dealStrength(cards),old(cards),`${count} ${id} + ${partner}`);
  }
  assert.deepEqual(dealStrength(ids),old(ids));
  assert.throws(()=>dealStrength(['unregistered']),/Missing character balance/);
});
