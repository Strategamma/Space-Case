import { pathToFileURL } from 'node:url';
import { ROLES, DEFAULT_SETTINGS } from '../public/roles.js';
import { CARD_LIMITS, CHARACTER_BALANCE } from '../public/setup.js';
import { ROLE_GUIDES } from '../public/wiki.js';
import { NIGHT_ORDER, NIGHT_STAGES } from '../public/script.js';

export const catalogue = {roles:ROLES, defaults:DEFAULT_SETTINGS.roles, limits:CARD_LIMITS, balance:CHARACTER_BALANCE, guides:ROLE_GUIDES, order:NIGHT_ORDER, stages:NIGHT_STAGES};
export function validateCharacters({roles, defaults, limits, balance, guides, order, stages} = catalogue) {
  const errors = [], ids = Object.keys(roles), names = new Set(), stageIds = new Set(stages.map(s=>s.id));
  const text = value => typeof value === 'string' && value.trim().length > 0;
  for (const [label, entries] of Object.entries({defaults,limits,balance,guides,order})) {
    for (const id of ids) if (!Object.hasOwn(entries,id)) errors.push(`${id}: missing ${label} registration`);
    for (const id of Object.keys(entries)) if (!Object.hasOwn(roles,id)) errors.push(`${id}: orphan ${label} registration`);
  }
  for (const [id, role] of Object.entries(roles)) {
    if (!/^[a-z][a-z0-9_]*$/.test(id)) errors.push(`${id}: invalid stable ID`);
    for (const field of ['name','description','timing','symbol']) if (!text(role[field])) errors.push(`${id}: missing ${field}`);
    if (typeof role.name === 'string') {
      const name=role.name.trim().toLowerCase();
      if(names.has(name)) errors.push(`${id}: duplicate character name`);
      names.add(name);
    }
    if (!['crew','hollow','martyr'].includes(role.team)) errors.push(`${id}: invalid allegiance`);
    if (!Number.isInteger(limits[id]) || limits[id] < 1) errors.push(`${id}: invalid copy limit`);
    if (!Number.isInteger(defaults[id]) || defaults[id] < 0 || defaults[id] > limits[id]) errors.push(`${id}: invalid default count`);
    if (role.action) {
      const a=role.action;
      if (!Number.isInteger(a.count) || a.count < 1 || a.count > 15) errors.push(`${id}: invalid target count`);
      if (!['living','dead','recent','adjacent','crew'].includes(a.life)) errors.push(`${id}: invalid target life rule`);
      if (typeof a.self !== 'boolean' || (a.once !== undefined && typeof a.once !== 'boolean')) errors.push(`${id}: invalid action flags`);
    }
    for (const when of ['first','other']) {
      const sequence=order[id]?.[when];
      if (!Array.isArray(sequence) || sequence.some(stage=>!stageIds.has(stage))) errors.push(`${id}: invalid ${when} resolution schedule`);
    }
    for (const section of ['Timing & orders','Resolution & interactions','Table rules']) {
      const paragraphs=guides[id]?.[section];
      if (!Array.isArray(paragraphs) || !paragraphs.length || !paragraphs.every(text)) errors.push(`${id}: incomplete guide: ${section}`);
    }
    const weight=balance[id];
    if(weight) {
      for(const [category,value] of Object.entries(weight)) {
        if(category==='requires') {
          if (!value || typeof value!=='object' || Array.isArray(value)) {errors.push(`${id}: invalid balance prerequisites`);continue;}
          for(const [dependency,minimum] of Object.entries(value)) if(!Object.hasOwn(roles,dependency)||!Number.isInteger(minimum)||minimum<1) errors.push(`${id}: invalid balance prerequisite ${dependency}`);
        } else if (!['information','defence','recovery','disruption','lethality'].includes(category) || !Number.isFinite(value) || value<0) errors.push(`${id}: invalid balance weight ${category}`);
      }
    } else if (Object.hasOwn(balance,id)) errors.push(`${id}: invalid balance registration`);
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors=validateCharacters();
  if(errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
  else console.log(`Character catalogue valid: ${Object.keys(ROLES).length} characters; guides, schedules, targets, defaults, limits and balance registered.`);
}
