import { canHunt } from './roles.js?v=1.0.2-playtest';
// Public resolution reference: never filter this with dealt roles or live choices.
export const NIGHT_STAGES = [
  {id:'briefing',title:'Private starting briefings',text:'Before dark cycle one: privately open your character and starting briefing. Network members meet; Oracle learns unused cards; Officer learns the assigned Xenobiologist.'},
  {id:'inherit',title:'Dark cycle activation',text:'Activate pending Echo powers. Expire the previous light cycle’s speech/vote restrictions.'},
  {id:'jam',title:'Silent disruption',text:'Jammer suppresses its target before dark cycle effects. No suppression notice is sent.'},
  {id:'ward',title:'Establish protection',text:'first dark cycle Warden binding or continuing copied/original wards. Jammed ward owners provide no protection.'},
  {id:'control',title:'Commit control and delay',text:'Wardbreaker, speech/vote restrictions, Cryo fields and Signal Saboteur delay apply before attacks and report delivery.'},
  {id:'facts',title:'Observe pre-attack facts',text:'Resolve valid scans, comparisons, records and Echo copies against the pre-attack state. Queue results; do not deliver yet.'},
  {id:'manifest',title:'Initial seating count',text:'Surveyor counts adjacent registered Hollow pairs in the original clockwise playing order. First dark cycle only.'},
  {id:'attack',title:'Resolve attacks and defences',text:'From dark cycle two: resolve the unanimous network attack and valid Void Reaver attack together. Shared victims receive one attack. Warden protects before Sentinel; Wardbreaker can suppress both.'},
  {id:'revival',title:'Surviving Medic revival',text:'Only surviving, unjammed Medics revive eligible previously dead targets. Revival does not grant an action from a dark cycle spent dead.'},
  {id:'casualties',title:'Casualty analysis',text:'Surviving, unjammed Research Assistants analyse this dark cycle’s attack deaths. Executions are excluded; Thrall registers Crew. Queue private reports.'},
  {id:'neighbours',title:'Final living-neighbour counts',text:'Proximity observes after deaths and revival, skipping dead berths. A dead investigator receives no new information.'},
  {id:'delivery',title:'Private delivery and interception',text:'Release due reports and fresh surviving recipients’ reports. Saboteur delays eligible fresh investigations; Parasite copies eligible reports actually delivered.'},
  {id:'routine',title:'Routine station / no special wake',text:'No role-specific wake announcement. Everyone stays privately at their station until the shared countdown ends.'}
];
const entry=(first,other,note='')=>({first,other,note});
export const NIGHT_ORDER = {
  martyr:entry(['routine'],['routine'],'Independent: wins only by actual, unblocked tribunal execution. Counts alongside Crew for Hollow parity; dark cycle kills do not trigger victory.'),
  cadet:entry(['routine'],['routine'],'No special power.'),
  hollow:entry(['briefing'],['attack'],'Network unanimity, dark cycle two onward. Thrall is excluded.'),
  xenobiologist:entry(['facts'],['facts'],'Choose one other living player; survives to receive report.'),
  analyst:entry(['facts'],['facts'],'Two players; whether either registers Hollow.'),
  engineer:entry(['facts'],['facts'],'Each dark cycle; choose two other living players.'),
  observer:entry(['briefing'],[],'Starting identity or absence only.'),
  assistant:entry(['casualties'],['casualties'],'Automatic: whether any dark cycle casualty registered Hollow; no targets.'),
  beacon:entry(['facts'],[],'first dark cycle adjacent recipient; no retry later.'),
  resonance:entry(['facts'],['facts'],'Once per voyage; use or wait.'),
  warden:entry(['ward'],['ward'],'Choose first dark cycle only; fixed ward continues while owner is active.'),
  medic:entry([],['revival'],'Once; eligible recent corpse, Medic must survive. Target selected before this dark cycle’s deaths.'),
  arbiter:entry(['control'],['control'],'Mute or suspend voting for the following light cycle.'),
  proximity:entry(['neighbours'],['neighbours'],'Automatic; final living neighbours after revival.'),
  surveyor:entry(['manifest'],[],'First light cycle only; 0 pairs, 1 pair or more.'),
  auditor:entry([],['facts'],'Previous execution death only; public role reveals must be off.'),
  diver:entry(['facts'],['facts'],'Once; dead target, observed before revival. Usually no first dark cycle target.'),
  sentinel:entry(['routine'],['attack'],'Passive defence when attacked; no dark cycle selection.'),
  stasis:entry(['control'],['control'],'Once; queues protection from the following light cycle’s execution.'),
  cartographer:entry(['facts'],['facts'],'Once; choose three other living players.'),
  jammer:entry(['jam'],['jam'],'Silent suppression happens before abilities.'),
  dreadcaster:entry(['control'],['control'],'No same target on consecutive dark cycles.'),
  leech:entry(['control'],['control'],'Once; suspend next light cycle’s vote.'),
  breachborn:entry([],['attack'],'Once; dark cycle two onward, at least five alive. Ordinary protection applies.'),
  thief:entry(['facts'],['facts'],'Once; exact actual character.'),
  forger:entry(['control'],['control'],'each dark cycle; never repeat a target during the voyage. Delay applies at delivery.'),
  wardbreaker:entry(['control'],['control'],'Suppress selected target’s ordinary protection.'),
  oracle:entry(['briefing'],[],'Unused Crew/special candidates; extra count plus dealt Hollow count; no each dark cycle selection.'),
  parasite:entry(['delivery'],['delivery'],'Once; copies eligible actual deliveries, including due older records.'),
  echo:entry(['facts'],['inherit','facts'],'Copy a dead player once; activates next dark cycle at the copied power’s order. Expired opportunities do not restart.'),
  thrall:entry(['facts'],['facts'],'Once; true-allegiance check. Registers Crew to other allegiance investigators; no attack vote.')
};
for(const key of ['jammer','dreadcaster','leech','breachborn','thief','forger','wardbreaker','parasite']) NIGHT_ORDER[key].first.unshift('briefing');
export function scriptOrder(roles,first=true) {
  const when=first?'first':'other';
  const shared = new Set(first ? ['delivery','routine'] : ['inherit','delivery','routine']);
  return NIGHT_STAGES.map(stage=>({...stage,cards:Object.keys(NIGHT_ORDER).filter(key=>
    (roles[key]||0)>0 && (NIGHT_ORDER[key][when].includes(stage.id) ||
      (!first && stage.id==='attack' && canHunt(key)) ||
      (stage.id==='routine' && NIGHT_ORDER[key][when].length===0))
  )})).filter(stage=>shared.has(stage.id)||stage.cards.length);
}
export function resolutionRank(role,first=false) {
  const stages=NIGHT_ORDER[role]?.[first?'first':'other']||[];
  return NIGHT_STAGES.findIndex(stage=>stage.id===stages.at(-1));
}
