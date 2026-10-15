import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES } from '../public/roles.js';
import { NIGHT_STAGES, NIGHT_ORDER } from '../public/script.js';
import { ROLE_GUIDES } from '../public/wiki.js';
import { cycleText } from '../public/cycles.js';

test('public character and cycle reference prose consistently uses cycle terminology',()=>{
  const texts=[...Object.values(ROLES).flatMap(r=>[r.description,r.timing]),...NIGHT_STAGES.flatMap(s=>[s.title,s.text]),...Object.values(NIGHT_ORDER).map(r=>r.note),...Object.values(ROLE_GUIDES).flatMap(g=>Object.values(g).flat())];
  for(const text of texts) assert.doesNotMatch(text,/\b(night\w*|day|days|dawn|dusk|tonight)\b/i);
});
test('old saved report and timestamp wording is normalized without changing cycle numbers',()=>{
  assert.equal(cycleText('Observed night 2; delayed until dawn 3.'),'Observed dark cycle 2; delayed until light cycle 3.');
  assert.equal(cycleText('Use tonight; next day. First-night power.'),'Use this dark cycle; next light cycle. first dark cycle power.');
  assert.equal(cycleText('Nova: Hollow signature detected.'),'Nova: Hollow signature detected.');
});
