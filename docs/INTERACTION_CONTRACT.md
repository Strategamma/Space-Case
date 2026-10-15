# Space Case interaction contract

Implementation status: all 28 cards are active. This remains the interaction specification, not proof of exhaustive coverage or game balance. Engine, privacy and compound-effect tests are in tests/abilities.test.js; verified browser/transport boundaries are recorded in docs/QA.md. This document resolves ambiguities in EXPANDED_ROSTER.md; current runtime behaviour is defined separately by CARD_RULES.md.

## 1. Discovery versus self-exposure

A Hollow power never announces its user's identity, exact character or allegiance to Crew. Public logs show deaths, revivals, restricted targets and execution outcomes, never their hidden source. Victim messages say “Speech restricted until next dark cycle”, not “Nova the Dreadcaster muted you”. Immediate confirmations acknowledge an actor's submitted order, not success, target role or presence of protection.

Legitimate discovery stays: truthful allegiance scans, permitted exact-character investigations, the optional exact-card death reveal, player admissions and postgame reveal. A role's presence or user can sometimes be inferred from public candidates and outcomes; no fabricated counter-evidence hides those deductions. Non-playing Captain oversight remains an explicitly different mode with assignments visible.

Replace evil Void Carapace with **Signal Saboteur**. No Hollow card automatically survives execution or publicly demonstrates a personal ability. Crew Cryo Guardian may still cause survival without revealing the source; that event does not certify either allegiance.

Transport is part of anonymity. Client-facing report/event IDs are opaque random IDs, not sender IDs or concatenations containing them. Internal source IDs, idempotency keys, cause tags, effect chains and targeted-player flags remain server-only. Report payloads whitelist fields; hiding a name in rendered text is insufficient. The moderator now generates opaque IDs and retains deduplication keys only on the server.

## 2. Common terms and validation

- Actor: one living playing seat at night start. Dead/non-playing/disconnected seats cannot submit character orders. Night disconnect pauses the shared deadline under existing rules.
- Circle: fixed playing-seat order after launch, excluding non-playing Captain. No mid-match reseating or replacing dead seats. “Adjacent berth” uses fixed neighbours; “living neighbours” skips dead seats and lists the exact evaluated IDs/names in the private result.
- Allegiance: stored Crew/Hollow team, not whether role ID literally equals `hollow`. No conversion, copied roles, deceptive registration or random false results in this roster.
- Pass is valid. Missing order at deadline is pass, never a random selection. Reject invalid/duplicate/excess targets before accepting an order. No resource is consumed by rejection, editing, disconnect or pass.
- Freeze accepted orders at shared deadline (or Hollow consensus lock for their orders). Server time is authoritative. An input arriving at or after deadline is rejected even if resolution has not yet ticked. A stamped resolution retries its saved decisions, never recomputes random outcomes.
- Changing an order before lock replaces it atomically; it does not use a charge. Once/game effects reserve a charge while queued and spend it once when a valid unblocked effect commits. Jam refunds elective charges; missing information because recipient later died does not refund a completed effect.
- No automatic starting knowledge is jammed: it is delivered at deliberate reveal, before first night. Night effects cannot erase a player's history or make known identities untrue.
- A player alive at order collection may be inspected even if killed during that resolution. Pre-attack investigations describe their recorded pre-attack state. Dawn-neighbour counts describe the final dawn state. These timestamps are explicit in messages.
- Too few eligible targets: show “No eligible targets this cycle”; no action, charge or random substitute. Do not expose hidden target eligibility for Crew-facing controls. Hollow already know their team, so a “living Crew” target list reveals nothing new to them.

## 3. Each card's complete input contract

U = unique specialist. Recurring actions may repeat targets unless stated otherwise. Result delivery still requires recipient survival. Every role can pass its optional selection. Starting/passive information does not need a choice.

| Character | Target / mode | Self? | Limit / repeat / special boundary |
|---|---|---|---|
| Cadet | Routine station diagnostic, no target | N/A | No privileged observation or game effect. |
| Xenobiologist | One other living player | No | U; every night; registered allegiance (Thrall reads Crew). |
| Signal Analyst | Two distinct other living players | No | U; every night; OR-of-Hollow, not pair equality. |
| Linked Engineer | Every night, night one onward; inspect two other living players | All matching Engineer names, or neither; private at dawn | No starting identity/absence knowledge. Jamming blocks that night; delay/interception/death follow investigations. Pool zero or 2+, any legal dealt count. |
| Observatory Officer | Automatic assigned Xenobiologist identity at reveal | N/A | U; explicit absence if unused. Does not identify an Assistant. |
| Research Assistant | Automatic each light cycle | No targets | Any current dark-cycle attack death registers Hollow or none/no casualties; excludes executions. Thrall reads Crew. Survive, jam/delay/interception apply. Requires death reveals off. |
| Beacon Operator | One fixed adjacent living playing berth | No | U; first night only. Cannot jump a dead berth. Recipient can be Hollow. One-way confirmation, no reply/target allegiance disclosed to sender. |
| Resonance Officer | Two distinct other living players | No | U; once/game from night one; choose use or wait. Exact same/different actual allegiance, not OR-of-Hollow. |
| Warden | One other living player, chosen first night | No | U; fixed link, no retarget. Jam suppresses protection for a night but preserves bound choice. If no first-night choice, no ward. If either dies, link is inactive; revival can reactivate it next night without a new choice. |
| Reclamation Medic | One dead seat in current recent-death window | No | U; once/game, night 2+. Window is deaths announced at most recent dawn plus that day's execution death. Earlier deaths and current unresolved attacks excluded. Medic must survive for revival. |
| Comms Arbiter | One living player; choose MUTE or NO VOTE | Yes | U; every night; exactly one mode, not both. May repeat. Lasts next day only. |
| Proximity Analyst | Automatic nearest distinct living neighbour each direction | N/A | U; every dawn while active. Deduplicate if only one other living seat. Report evaluated names and count 0..number of neighbours. |
| Orbit Surveyor | Automatic initial circular manifest | N/A | U; first dawn only, no retry if jammed. Count each distinct adjacent edge once, including last–first. An H-H-H run contributes two edges unless wrapping adds another. |
| Tribunal Auditor | Automatic player who died by latest day's execution | N/A | U; night 2+. No execution death -> explicit no execution record, not an invented character. Execution survival does not count. |
| Memory Diver | One currently dead player | No | U; once/game. Observation is exact character before revival; remains historically valid if target revives that dawn. |
| Hull Sentinel | Automatic self defence | N/A | U; first ordinary attack actually blocked spends charge. No defence versus execution. Suppressed or redundant protection does not spend charge. |
| Cryo Guardian | One living player | Yes | U; once/game; next day only. Works only if at least five living immediately before execution; a valid queued field spends use even if no execution occurs or threshold later fails. |
| Cartographer | Three distinct other living players | No | U; once/game; exact Hollow count 0..3. |
| The Hollow | Any playing seat, living/dead/Crew/Hollow | Yes | Repeatable basic card; collective attack only from night 2. |
| Static Jammer | One living Crew member | No | U; every night; disables night active/passive powers, not starting knowledge, ordinary ballots or speech. Crew-only targets prevent blocker cycles. |
| Dreadcaster | One other living player | No | U; every night; cannot repeat its own last successfully committed target on consecutive cycles. A pass resets the consecutive-cycle restriction. Daytime mute only. |
| Ballot Leech | One other living player | No | U; once/game; next-day NO VOTE only. |
| Void Reaver | One living Crew member | No | U; once/game, night 2+, at least five living at collection. Bonus ordinary attack respects Warden/Sentinel; shared victims receive one attack, but the extra use is spent. |
| Cortex Thief | One other living player | No | U; once/game; exact actual character. Cannot copy/use their power. |
| Signal Saboteur | One living Crew member | No | U; nightly, never repeat a target during the voyage; new eligible investigative reports from this dawn are queued until the following dawn. No fabricated reports; details below. |
| Wardbreaker | One living Crew member | No | U; every night; suppresses incoming ordinary night wards and innate ordinary-attack defence for that target only, including Sentinel. Does not jam their investigation or disable daytime Stasis. |
| Wreck Oracle | Automatic three actual unused cards at reveal | N/A | U; preserves duplicates. No role-to-player mapping or invented bluff cards. |
| Signal Parasite | One living Crew member | No | U; once/game; copies whitelisted investigative reports actually delivered to target this dawn, including a delayed report due now. Not old inbox history. |

Hollow order flow: submit/skip special order, then select collective victim. All living Hollow selections stream only to living Hollow. Unanimity locks the victim and all Hollow special orders; no further editing. Before unanimity, clearing a victim choice unlocks that player's special edit and prevents consensus. Missing special order defaults to pass at deadline. No consensus means no collective attack, but valid special orders still resolve. First night offers special-order submit/skip only. Shared night clock never ends early.

## 4. Deterministic resolution

0. Starting phase: deliberate reveal returns own card plus entitled initial reports. Acknowledge gates first night. Choices and night-one information are not delivered early at reveal.
1. At night start expire previous day effects, activate eligible Assistant inheritance, and snapshot actors, roles, seats, life state, resources and previous day's execution/recent deaths. Collect input to shared deadline.
2. Apply Jammer suppression to one Crew target. A suppressed role cannot create new effects/reports or use its passive night ability this cycle. Preserve its stored knowledge and Warden binding. No blocker chain exists in the selected roster.
3. Establish Warden ordinary protection, Stasis commitments, next-day control, Signal Saboteur delay and Wardbreaker suppression. Effects committed now survive their caster's later night death, except Medic specifically requires survival. Forger's delayed queue survives its caster's death. Warden's established ward lasts this batch even if Warden dies; continuing ward is recomputed next night.
4. Calculate pre-attack investigations (Xenobiologist, Assistant, Signal/Resonance, Cartographer, Auditor, Diver, Thief) as typed results; record observed cycle and stage. Do not deliver them yet.
5. Resolve deduplicated ordinary collective and extra attacks as one death batch. Ordinary defence priority: active Warden ward first, then unsuppressed Sentinel charge. Wardbreaker makes both unavailable for its target. Both attacks respect both defences. No first-night killing. A player targeted twice dies once. Do not evaluate victory mid-batch or between those two attacks.
6. Commit Medic revival only if Medic survives, unjammed, with a valid previously-dead target. Restore that seat's role/allegiance/spent charges. No ability, starting re-reveal, inherited update or fresh passive report for a seat that spent this night dead. Speaking/nomination/voting resume at dawn; powers can operate next night. Revival does not rewind history. Dead actor cannot resurrect self or act via queued client input.
7. Compute Proximity from final life state including revived neighbours. Orbit Surveyor uses initial snapshot. Dead observers get no new report, including why they were blocked. Surviving recipients receive effect/status instructions and factual reports through the delivery policy below.
8. Deliver due delayed records and fresh records, applying Forger to fresh eligible records only; then resolve Parasite against actual eligible delivery events. Publish life/status outcomes without source attribution, evaluate final victory, and award winning team once. Death/revival beats and information arrive as one completed dawn state; no provisional parity screen before revival.

All final states must be computed and persisted atomically before messages. On restart, replay saved committed outcomes rather than re-run RNG/choices. No UI guesses whether an ability succeeded before the authoritative result arrives.

## 5. Delivery, delay and interception

Investigative whitelist: structured allegiance inspection, pair comparison, pair OR, neighbour/initial-pair/cartography count, execution identity and dead-record identity. Thief's report is investigative, but Forger/Parasite only target Crew so it is not intercepted through this roster.

Excluded: sealed card itself, Officer/Oracle initial knowledge, Hollow network/targets, Beacon confirmation, inheritance notice, mute/no-vote instructions, ward receipts, death notices, action acknowledgements, raw logs and any intercepted messages. Status delivery is never delayed: a player must know how they may act.

Forger stores eligible fresh records for one dawn. Recipient gets generic “Investigative transmission delayed until next dawn”, without source. Next dawn release the original report with original observed cycle/time, not a fresh measurement. If recipient is dead then, discard it permanently. A later revival does not deliver missed records. If match ends before release, it never becomes mid-game information; postgame reveal may explain it separately. A jammed Forger cannot occur under current Crew-only blocker rules; future hostile blockers require a new ordering rule before being added. Never recursively delay already queued records.

Parasite copies only whitelisted records actually delivered this dawn. If chosen Crew observer died, their undelivered draft is not copied. If Forger delayed all fresh reports and no older one was due, Parasite receives “No eligible transmission received”; it cannot bypass delay. A report due from a previous cycle can be copied with its original timestamp. Sender/recipient context is rendered intentionally, with no hidden caster metadata. Parasite's use is spent even on no report. Recipient is not told of interception. Target/Parasite death is checked at delivery. No copies of copies or self-trigger loops.

My orders contains: character/objective; active restrictions and exact expiry; available ability controls; chronologically labelled reports; submitted order receipts; old information clearly marked by observed cycle. Every new private item has an opaque ID and unread state; badge clears only for items actually opened. An order edit/receipt must not continuously re-trigger the new-information dot; notify for character briefing, new final result/status, inheritance or successful revival instructions. Unread state is scoped by match and seat and survives refresh. No automatic secret popup, message preview, sound cue or public board badge indicates who got an investigative result. Ability form runs inside My orders; the existing Private station may serve as a shortcut to the same form, not a separate conflicting order.

If a player is killed while viewing orders, replace it with the death screen, retain old inbox read-only and remove character actions. New private data is not sent while dead. Revival is an explicit public life-state exception, after which a private “You are alive; act from next night” instruction is permitted. Death history, used charges, scores and old reports persist.

## 6. Cross-effect table

This table groups role pairs by actual effect semantics. Every card belongs to its declared families above; combinations not sharing a target, life state, resource, delivery or ballot dependency commute. Pairwise tests alone do not cover higher-order collisions; see section 8.

| Interaction | Required outcome |
|---|---|
| Any investigation × any Hollow identity | Actual stored team/character; no disguised allegiance or automatic caster exposure. |
| Jam × investigator/passive counter | No factual result or disruption notice that cycle. |
| Jam × Medic/Diver/Cartographer/Stasis | No effect, no charge spent; no accidental fallback target. |
| Jam × Warden | Link retained, that night's ward absent; attacker identity never disclosed. |
| Jam × Sentinel | Defence absent; charge retained; may die, then no new private report. |
| Jam × Beacon | No confirmation delivered; no false loyalty statement. First-night opportunity expires. |
| Jam × Arbiter | Neither mute nor NO VOTE applied. Existing expired prior-day status is not renewed. |
| Jam × starting Officer/Oracle | Cannot erase/rewrite earlier reveal information. |
| Jam × Assistant inheritance | Inherited flag persists; scan unavailable that night. Revealing inheritance itself is not a scan. |
| Warden × ordinary attack | Target survives; no redirection, replacement victim or kill-source disclosure. |
| Warden × Sentinel × ordinary attack | Warden absorbs; Sentinel charge remains unused. |
| Wardbreaker × either/both ordinary defences | Ordinary attack kills unless another explicitly defined defence exists; no defence charge spent. |
| Extra attack × Warden/Sentinel | Ordinary defence applies to the extra attack. |
| Collective and extra × same target | Deduplicate to one attack. Warden blocks it or Sentinel spends one charge and survives. Extra use is still spent. |
| Caster death × already committed ward/control/Forger | Committed duration remains; later cycles require living caster where applicable. |
| Caster death × queued Medic | Revival fails. Living-only delivery prevents a new report to dead Medic. |
| Investigator dies × target survives/dies | No new report to dead investigator; target's death cannot send a result to a ghost. |
| Beacon sender dies × recipient survives | Committed confirmation arrives truthfully, identifying now-dead Crew sender. Night one currently has no deaths, but rule is defined. |
| Beacon recipient dies | No new confirmation; no rerouting. |
| Medic × Memory Diver on same dead target | Diver observes pre-revival role; Medic restores same role. Report is timestamped, not false. |
| Medic × previously bound Warden/Sentinel/Assistant | Restore binding/remaining charge/inherited flag; no resetting uses or first-night choices. |
| Medic × Hollow corpse | Restore Hollow allegiance and include it in final parity. Living Hollow network includes the revived teammate at dawn; no new actions until next night. |
| Medic × Proximity | Revived neighbour included in dawn count; names clarify who was evaluated. |
| Medic × temporary restriction on corpse | Dead targets could not be selected for control. Expired old restriction stays expired; no revived-day punishment carried over. |
| Forger × any whitelisted fresh report | Save original factual result, deliver generic delay instruction, release next dawn if recipient living. |
| Forger × jammed role | No invented investigation to queue. No disruption notice is sent. |
| Forger × Oracle/Officer/Beacon/status | Cannot delay those categories. |
| Forger × Parasite | Parasite sees only actual permitted deliveries, not pending queue; original timestamps survive copies. |
| Repeated restrictions on same target | Same effect does not stack duration or create duplicate status. MUTE plus NO VOTE both apply, with separate clear instructions. |
| Source dies × next-day restriction | Committed status lasts to its specified next-night expiry; death does not reveal source. |
| Mute × nomination/vote | Speech prohibited; nomination and secret ballot remain available unless separate NO VOTE. |
| NO VOTE × self-nomination | May nominate/be nominated; cannot submit ballot. |
| NO VOTE × threshold/tie | Freeze eligible IDs per ballot; threshold ceil(eligible/2), minimum one. Tie logic unchanged. |
| Zero eligible voters | No ballots/no execution; Captain can close nominations. Never threshold zero. |
| Stasis × execution | If >=5 alive before execution, survives; execution allowance spent, no death/card reveal/Auditor identity. Otherwise dies normally. |
| Stasis caster dies × execution | Committed next-day field still eligible; no source reveal. |
| Multiple potential execution protections | Boolean survival, not multiple executions or resource resets; currently only unique Stasis exists. |
| Execution/death reveal × hidden Hollow source rule | Dead character shown only when configured; discovery is intentional, not an ability announcing its caster. |
| Victory × delayed data/revival | Night settles before check; no actions/results/late revival after final victory. |
| Reconnect/retry × any effect | Same committed outcome once; no duplicate life changes, reports, resources or points. |

## 7. Day and voting invariants

MUTE is an in-person conduct rule, with public restricted-target badge; no microphone monitoring. Captain records nomination using existing controls, so a muted player can indicate nomination silently. NO VOTE changes actual server eligibility, not just UI. Controls expire together at next night start. Death always removes eligibility independently. There is no passive “your vote secretly counts twice”, fake ballot, or hidden altered result in this roster.

For each ballot, freeze living voters without NO VOTE. Only those IDs may cast immutable ballots. All must respond; a lost connection cannot be silently counted Spare. Preserve/resume pending ballot or pause it; never silently shrink denominator after ballots arrive. Every nomination that day uses same statuses; no new death-changing daytime power exists except the one end-of-day execution. All counts and tied-highest block logic use executed votes, not nominator identity. Self-nomination and once-daily nomination limits remain.

If target dies at closing execution, publish death and optional card. If Stasis triggers, publish “Execution completed. Nova survived.”, never source, allegiance or protective character. In either case no second execution. “No execution death today” is Auditor's honest next-night result. Evaluate victory after execution; once ended, Medic cannot reopen the match.

## 8. Required implementation evidence

Before a role is selectable, its target predicate, pass/missing input, self/duplicate/dead target rejection, first-night rule, charge, repeated-night rule, blocker response, actor/recipient death, role reveal on/off, inactive dependency and permitted message fields require tests. Test every special role as player and as playing Captain. Non-playing Captain gets only explicitly permitted oversight. Team classification is now shared across dealing, target validation, scans, network, parity, victory and results; retain regression checks for every evil identity.

Family matrix tests must cover every relevant row above, using every role in the family; additionally use adversarial higher-order scenarios:

1. Jammer suppresses Warden; ordinary attack hits ward target who is also Sentinel.
2. Warden + Sentinel + Wardbreaker + collective + extra attacks hit one target.
3. Jammed Medic attempts revival while pre-revival deaths would create parity.
4. Medic survives, revives Hollow, changes final parity; no intermediate wrong victory.
5. Medic revives Warden/Assistant with existing binding/inheritance; spent powers remain spent.
6. Diver inspects corpse, Medic revives it, Forger delays Diver result, Parasite intercepts at release next cycle.
7. Forger delays final investigation, target dies next cycle before release, Medic later revives target: never deliver discarded result.
8. Crew/Hollow mute and vote restriction overlap; caster dies; target self-nominates; eligible threshold stays correct.
9. Stasis caster dies overnight, its target reaches execution with four versus five living; check both outcomes and Auditor.
10. Assistant inherits, Xenobiologist revives same dawn; both scan next night without resetting history.
11. Observer/Oracle read starting facts, jam occurs later: facts stay intact and private.
12. No Hollow consensus but valid Jammer/Forger special orders; no collective kill, valid powers still resolve.
13. Restart/disconnect at each resolution boundary, resend all commands: exactly one resource spend/report/kill/revival/award.
14. Inspect every player/Captain payload, reconnect snapshot, error, event and notification for hidden source IDs and unauthorised assignments.
15. Dead player keeps inbox open through incoming report batch and revival: no ghost delivery or stale action controls.

Coverage does not mean every generated matrix cell was tested by its own generator. Compare resolver against independent expected outcomes and model invariants. Playtest roster budgets separately; correctness tests cannot prove fun or 50/50 balance. Do not promise “all possible interactions tested” until evidence exists, and retain this distinction in handoffs.

### Reviewed public controls

Captain alone may reorder playing berths in lobby. Clockwise order is room.players filtered to playing seats; last neighbours first. Order locks at launch, persists through reconnect/revival, and retains dead berths. Surveyor counts initial adjacent Hollow edges; returns 0 pairs, 1 pair or multiple pairs. Public mute/no-vote badges and dawn announcements omit the caster. Tribunal Auditor is blocked in candidate selection, settings and launch while public character reveals are enabled; its report remains private in My orders.

### Fourth group decisions

Collective attack uses the shared 30/45/60/90-second night timer (default 45), never ends early, and still requires living Hollow unanimity. All playing seats are targets, including self, teammates and dead seats; observers are excluded. Living Hollow targets can die with ordinary protection rules. Dead targets cause no collective death; other special kills can still occur. Only living Hollow receive dynamic network choices. Cartographer acts only at night. Jammer gives no suppression notice; prior information remains and blocked one-use powers retain their charge.

## Echo / Thrall contract

True allegiance, investigative registration, and network membership are distinct. Thrall is true evil and scans Crew, excluded from network/consensus. Its single check reads actual allegiance. Exact role inspections reveal actual character. Hostile non-network lists include Thrall; a deal with only Thrall as evil is illegal.

Echo keeps actual Crew/Echo identity while powerRole supplies copied Crew ability. Select all dead seats without hidden allegiance filters. Invalid Echo/evil selection spends the copy and reports only “Nothing happened.” Snapshot valid power and spent charges/inheritance/ward link before revival; activate next night only while alive. Expired first-night/starting information does not restart. Jam suppresses copying silently without spending it. Copy/activation are status reports, not interceptable investigations; copied investigations remain investigative. Snapshot and active state survive restart/revival, reset on rematch. Dead Echo cannot read pending role not delivered before death. Multiple wards union; multiple surviving Medics may restore a corpse once and receive truthful receipts.

## Bot God and public Script

Captain selects player count plus 3/4/5 candidates; sampler validates every actual deal before weighting/shuffling. First night begins automatically after all playing seats reveal/acknowledge and reconnect. Public Script shows saved possible roles with Character sheet/Night order tabs and first/later-night references; never actual assignments, unused identities or live role activity. Shared schedule: public/script.js. Actions collect simultaneously; effects resolve in dependency order. Optional neutral Night watch has no authoritative effect; night UI tones are suppressed. See BOT_GOD.md for all 30 schedules, input authority, balance limits and physical privacy limits.
