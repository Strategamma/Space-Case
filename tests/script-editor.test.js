import test from 'node:test';
import assert from 'node:assert/strict';
import {randomPool,poolError,poolSize,CARD_LIMITS,factionLimits,evilCount} from '../public/setup.js';
const seeded=seed=>size=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*size);};
test('randomized scripts respect size, reveal compatibility, dependencies and faction limits',()=>{
  for(let n=6;n<=15;n++)for(const spare of [3,4,5])for(const reveal of [false,true]){
    const roles=randomPool(n,spare,reveal,seeded(n*31+spare+(reveal?1000:0)));
    assert.equal(poolSize(roles),n+spare);assert.equal(poolError(n,roles,reveal,spare),null,`${n}+${spare}`);
    for(const [key,count] of Object.entries(roles))assert.ok(count>=0&&count<=CARD_LIMITS[key]);
    assert.ok(roles.hollow>=1);assert.ok(poolSize(roles)-evilCount(roles)>=factionLimits(n).minGood);
    if(reveal)assert.equal(roles.auditor,0);
    assert.notEqual(roles.engineer,1);if(roles.observer)assert.ok(roles.xenobiologist);
  }
});
test('randomizer varies characters and keeps the pool editable rather than assigning players',()=>{
  const variants=new Set(Array.from({length:12},(_,i)=>JSON.stringify(randomPool(10,4,false,seeded(i+1)))));
  assert.ok(variants.size>=8);assert.ok([...variants].every(value=>!value.includes('playerId')));
});
test('invalid randomizer configuration is rejected without producing a draft',()=>{
  for(const n of [5,16,6.5])assert.throws(()=>randomPool(n,3),/6–15/);
  for(const spare of [2,6,'3'])assert.throws(()=>randomPool(6,spare),/backup cadets/);
});
