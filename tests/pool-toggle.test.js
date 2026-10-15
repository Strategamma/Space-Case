import test from 'node:test';
import assert from 'node:assert/strict';
import { togglePoolRole, adjustPoolCopies, CARD_LIMITS } from '../public/setup.js';
import { ROLE_GUIDES } from '../public/wiki.js';
import { ROLES } from '../public/roles.js';

test('Engineer selection starts paired, supports extra copies and clears as a group',()=>{
  let n=togglePoolRole('engineer',0);assert.equal(n,2);
  n=adjustPoolCopies('engineer',n,1);assert.equal(n,3);
  n=adjustPoolCopies('engineer',n,-1);assert.equal(n,2);
  assert.equal(adjustPoolCopies('engineer',n,-1),2);
  assert.equal(togglePoolRole('engineer',n),0);
});
test('all role toggles clear selected groups and repeatable quantities stay bounded',()=>{
  for(const [key,max] of Object.entries(CARD_LIMITS)){
    const initial=togglePoolRole(key,0);assert.ok(initial>=1&&initial<=max);
    assert.equal(togglePoolRole(key,max),0);
    assert.equal(adjustPoolCopies(key,max,1),max);
    assert.equal(adjustPoolCopies(key,0,1),0);
  }
});
test('every public role has a detailed reference without hidden match inputs',()=>{
  assert.deepEqual(Object.keys(ROLE_GUIDES).sort(),Object.keys(ROLES).sort());
  for(const guide of Object.values(ROLE_GUIDES)){
    assert.ok(guide['Resolution & interactions'].length>=2);
    for(const lines of Object.values(guide)) assert.ok(lines.every(line=>typeof line==='string'&&line.length>20));
  }
});

test('full pools block additions but permit removal, including over-cap drafts',()=>{
  assert.equal(togglePoolRole('analyst',0,0),0);
  assert.equal(togglePoolRole('engineer',0,1),0);
  assert.equal(togglePoolRole('engineer',0,2),2);
  assert.equal(togglePoolRole('engineer',3,-4),0);
  assert.equal(adjustPoolCopies('cadet',3,1,0),3);
  assert.equal(adjustPoolCopies('cadet',3,-1,-4),2);
  assert.equal(adjustPoolCopies('engineer',2,1,1),3);
});

test('Assistant pool needs hidden death roles but no Xenobiologist',async()=>{
  const {poolError,dealStrength}=await import('../public/setup.js');
  const pool=Object.fromEntries(Object.keys(ROLES).map(key=>[key,0]));Object.assign(pool,{assistant:1,hollow:1,cadet:7});
  assert.equal(poolError(6,pool,false,3),null);assert.match(poolError(6,pool,true,3),/Research Assistant/);
  assert.ok(dealStrength(['assistant','hollow','cadet','cadet','cadet','cadet']).information>0);
});
