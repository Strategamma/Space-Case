import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { ROLES, isHollow } from '../public/roles.js';

const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
function ui(name, state, extra = {}) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  const context = vm.createContext({ state, socket:{connected:true}, ROLES, isHollow,
    esc: value => String(value ?? '').replaceAll('<','&lt;').replaceAll('>','&gt;'),
    avatar: () => '', icon: () => '', button: () => '', cycleText: text => text, ...extra });
  vm.runInContext(source.slice(start, end), context);
  return (...args) => context[name](...args);
}
const base = () => ({ phase:'night', me:{alive:true,ballot:null}, players:[], pause:null });
const caps = () => ({ability:{active:true,count:2},hunt:{active:false},restrictions:{}});

test('private next step distinguishes unsubmitted, received, skipped and consensus orders', () => {
  const state = base(), c = caps(), guide = ui('nextOrder', state);
  assert.match(guide(c), /Choose 2 targets/);
  c.ability.submitted = true;
  assert.match(guide(c), /order is received/);
  c.ability.passed = true;
  assert.match(guide(c), /skipped/);
  c.hunt = {active:true,selection:[]};
  assert.match(guide(c), /Choose a collective attack target/);
  c.hunt.selection = ['someone'];
  assert.match(guide(c), /Wait for the other living network members/);
  c.hunt = {active:false,locked:true};
  assert.match(guide(c), /target is sealed/);
});

test('private guidance respects connection loss, death, pauses, ballot and speech restrictions', () => {
  const state = base(), c = caps(), guide = ui('nextOrder',state);
  assert.match(ui('nextOrder',state,{socket:{connected:false}})(c), /connection is interrupted/);
  state.me.alive = false; assert.match(guide(c), /Follow silently/);
  state.me.alive = true; state.pause = {}; assert.match(guide(c), /paused/);
  state.pause = null; state.phase = 'voting'; c.restrictions.noVote = true;
  assert.match(guide(c), /voting is suspended/);
  c.restrictions.noVote = false; assert.match(guide(c), /cast Execute or Spare/);
  state.me.ballot = false; assert.match(guide(c), /ballot is sealed/);
  state.phase = 'discussion'; c.restrictions.mute = true;
  assert.match(guide(c), /speech is restricted/);
  state.phase = 'orders'; state.me.acknowledged = true;
  assert.match(guide(c), /starts automatically/);
});

test('ballot explains frozen eligible threshold, earlier highest total and execution timing', () => {
  const state = {players:[],nomination:{},eligibleCount:5,high:4,me:{playing:false},votesCast:0};
  const text = ui('voting',state)();
  assert.match(text, /3 Execute votes needed/);
  assert.match(text, /highest total so far is <strong>4/);
  assert.match(text, /matching it clears the block/);
  assert.match(text, /Voting does not execute anyone immediately/);
  state.eligibleCount = 6; state.high = 0;
  assert.match(ui('voting',state)(), /3 Execute votes needed/);
  assert.match(ui('voting',state)(), /tied highest qualifying total clears the block/);
});

test('final reveal includes fallen winning teammates and public events, excludes private reports', () => {
  const state = {winner:'crew',players:[{id:'1',name:'<Cadet>',role:'cadet',playing:true,alive:false,score:1},{id:'2',name:'Hidden enemy',role:'hollow',playing:true,alive:false,score:0},{id:'3',name:'Overseer',playing:false}],me:{id:'1',playing:true,role:'cadet'},host:'3',settings:{},log:[{day:2,text:'Public nomination'}],unused:[],reports:['Private secret']};
  const text = ui('victory',state)();
  assert.match(text, /THE FINAL REVEAL/);
  assert.match(text, /&lt;Cadet&gt;/);
  assert.match(text, /Crew · Fallen · Winning team/);
  assert.match(text, /Hidden enemy/);
  assert.match(text, /Public nomination/);
  assert.doesNotMatch(text, /Private secret|Overseer/);
  assert.match(text, /no living Hollow remain/);
  state.winner='hollow'; assert.match(ui('victory',state)(), /equal or outnumber/);
});
