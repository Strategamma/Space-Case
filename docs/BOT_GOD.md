# Bot God: moderator contract

Bot God is the authoritative server rule engine. It does not need a language model to invent rulings, information or team balance. Public narration may be decorative; facts and actions come only from validated state. Existing approved card rules remain authoritative.

## Inputs from the Captain

| Input | When | Validation / effect |
|---|---|---|
| Playing crew count | Lobby | 6–15; includes a playing Captain, excludes an overseeing Captain. Launch requires exactly that many connected players. |
| Spare cards | Lobby | 3, 4 or 5. Host selects exactly N + spare cards; N are secretly dealt. |
| Candidate card multiset | Lobby | Library cards and copy limits; team minima, at least one attack-capable Hollow in every actual deal, role dependencies and compatibility. Engineer candidates zero or 2+. |
| Randomize script request | Lobby Script editor | Prefills a varied compatible pool sized to N+spares; never assigns players. Isolated draft supports add/remove/clear/fill. Apply then save briefing. |
| Captain playing / overseeing | Lobby | Playing Captain sees only own secrets; overseer has no role, vote or score. |
| Public character reveals | Lobby | If enabled, exact death cards become public. Auditor cannot be selected. |
| Clockwise seat order | Lobby | Captain moves playing berths to match physical seating; last touches first. Locks at launch. |
| Night timer | Lobby | 30/45/60/90 seconds; shared by everyone, never shortened by secret completion. |
| Discussion timer | Lobby | 2/3/5/7/10 minutes. |
| Launch | Lobby | Validate, choose legal secret subset, shuffle assignments independent of seat order, persist before broadcast. |
| Discussion extension / nominations | Day | Add one minute; record actual nominator and nominee. Bot validates living/once-per-day eligibility. |
| Close ballot / final nominations | Tribunal | Secret votes come from players, never Captain. Close requires eligible votes; one execution, threshold and ties enforced. |
| Start subsequent night / rematch | Aftermath / victory | Preserve or reset state according to explicit command. |

Captain cannot choose actual assignments, inspect a playing opponent's secrets, select another player's night action, override ballots, force a fake result or end a night based on hidden readiness. Connection loss automatically pauses eligible phases; succession requires player consent.

## Duties across the match

1. Authenticate boarding passes, reserve exclusive cosmetic avatars, preserve seats and reconnect state.
2. Validate configuration and suggest a usable public pool. Reject an impossible setup with a clear public explanation.
3. Enumerate legal N-card deals from N+3/4/5 candidates; enforce true-allegiance quotas, an actual attacker, information/protection/recovery budgets and dependencies. Weight legal deals by relative strengths, then cryptographically shuffle seats. No post-deal secret team changes or mid-match balancing.
4. Store the deal before showing anything. Each player explicitly reveals and acknowledges their own card/starting information. Once all playing seats are ready and connected, start night one automatically; no first-night kills.
5. Offer only legal private actions for the player's state, phase, life, resources and role. Accept explicit passes; missing night choices become no action at the shared deadline. Invalid commands do not consume uses.
6. Freeze input at the deadline and resolve in the order below. Silent jam never fabricates false results. Echo identity, copied powers, Thrall registration and actual allegiance remain distinct.
7. Deliver only entitled reports, with original cycle/time, and unread notification dots. Apply delay/interception, death withholding and revival correctly. Publish only finished dawn outcomes; flip all death tokens together, respecting public reveal setting. Do not publish interim parity before revival.
8. Enforce nominations, frozen eligible-voter denominators, immutable secret ballots, ties and at most one execution. Publish speech/vote restrictions at dawn without source; expire them next night.
9. Check actual victory after the completed effect batch; award one point per winning teammate exactly once, including dead teammates. Offer rematch.
10. Persist resources, pending/deferred reports, seating, deadlines and resolution stamps before broadcasts. Serialize mutations, reject stale actions, prevent duplicate resolution, pause/reconnect safely, and roll back failed saves.

Balance is a constrained weighted model, not a proven win-probability optimizer. Suggested pools and admitted deals still need human tests by player count and roster. Offline shell caching cannot keep Internet multiplayer running without its server.

## Collection is not resolution

Everyone attends their private terminal simultaneously. The public night reference is not a visible wake schedule and never shows live completion, target choices or which listed powers were dealt. Effects resolve server-side at the deadline. A choice can be collected early while its effect happens later: Medic selects an already eligible corpse before deaths; only a surviving Medic revives it after attacks. Proximity counts final neighbours after revival. Pre-attack investigators do not receive queued results if dead at delivery. This preserves the approved Space Case rules.

First night includes setup-only information and Surveyor/Beacon opportunities; attacks and Medic revival are absent. Starting knowledge happens on deliberate reveal, before the first shared timer. Later nights begin with Echo activation/inheritance and restriction expiry.

1. **Private starting briefings:** Before night one: deliberate character reveal. Network members meet; Oracle learns unused cards; Officer learns the assigned Xenobiologist.
2. **Night-start activation:** Activate pending Echo powers. Expire yesterday’s speech/vote restrictions.
3. **Silent disruption:** Jammer suppresses its target before night effects. No suppression notice is sent.
4. **Establish protection:** First-night Warden binding or continuing copied/original wards. Jammed ward owners provide no protection.
5. **Commit control and delay:** Wardbreaker, speech/vote restrictions, Cryo fields and Signal Saboteur delay apply before attacks and report delivery.
6. **Observe pre-attack facts:** Resolve valid scans, comparisons, records and Echo copies against the pre-attack state. Queue results; do not deliver yet.
7. **Initial seating count:** Surveyor counts adjacent registered Hollow pairs in the original clockwise playing order. First night only.
8. **Resolve attacks and defences:** From night two: resolve the unanimous network attack and valid Void Reaver attack together. Shared victims receive one attack. Warden protects before Sentinel; Wardbreaker can suppress both.
9. **Surviving Medic revival:** Only surviving, unjammed Medics revive eligible previously dead targets. Revival does not grant an action from a night spent dead.
10. **Final living-neighbour counts:** Proximity observes after deaths and revival, skipping dead berths. A dead investigator receives no new information.
11. **Private delivery and interception:** Release due reports and fresh surviving recipients’ reports. Saboteur delays eligible fresh investigations; Parasite copies eligible reports actually delivered.

Finish with public dawn, private eligible delivery/interception and victory. Public Script groups are static dependencies, not evidence a role acted. Echo uses the copied power's order only from its activation night; no new first-night opportunity is created.

## Master character schedule (all 30)

| Character | First night / setup | Later nights | Conditions |
|---|---|---|---|
| Cadet | Routine station / no special wake | Routine station / no special wake | No special power. |
| The Hollow | Private starting briefings | Resolve attacks and defences | Network unanimity, night two onward. Thrall is excluded. |
| Xenobiologist | Observe pre-attack facts | Observe pre-attack facts | Choose one other living player; survives to receive report. |
| Signal Analyst | Observe pre-attack facts | Observe pre-attack facts | Two players; whether either registers Hollow. |
| Linked Engineer | Observe pre-attack facts | Observe pre-attack facts | Each night; choose two other living players. |
| Observatory Officer | Private starting briefings | No later-night action | Starting identity or absence only. |
| Research Assistant | Casualty analysis | Casualty analysis | Automatic registered Hollow presence among current dark-cycle deaths; excludes executions; no targets. |
| Beacon Operator | Observe pre-attack facts | No later-night action | First-night adjacent recipient; no retry later. |
| Resonance Officer | Observe pre-attack facts | Observe pre-attack facts | Once per voyage; use or wait. |
| Warden | Establish protection | Establish protection | Choose first night only; fixed ward continues while owner is active. |
| Reclamation Medic | No first-night action | Surviving Medic revival | Once; eligible recent corpse, Medic must survive. Target selected before this night’s deaths. |
| Comms Arbiter | Commit control and delay | Commit control and delay | Mute or suspend voting for the following day. |
| Proximity Analyst | Final living-neighbour counts | Final living-neighbour counts | Automatic; final living neighbours after revival. |
| Orbit Surveyor | Initial seating count | No later-night action | First dawn only; 0 pairs, 1 pair or more. |
| Tribunal Auditor | No first-night action | Observe pre-attack facts | Previous execution death only; public role reveals must be off. |
| Memory Diver | Observe pre-attack facts | Observe pre-attack facts | Once; dead target, observed before revival. Usually no first-night target. |
| Hull Sentinel | Routine station / no special wake | Resolve attacks and defences | Passive defence when attacked; no night selection. |
| Cryo Guardian | Commit control and delay | Commit control and delay | Once; queues protection from the following day’s execution. |
| Cartographer | Observe pre-attack facts | Observe pre-attack facts | Once; choose three other living players. |
| Static Jammer | Private starting briefings; Silent disruption | Silent disruption | Silent suppression happens before abilities. |
| Dreadcaster | Private starting briefings; Commit control and delay | Commit control and delay | No same target on consecutive nights. |
| Ballot Leech | Private starting briefings; Commit control and delay | Commit control and delay | Once; suspend next day’s vote. |
| Void Reaver | Private starting briefings | Resolve attacks and defences | Once; night two onward, at least five alive. Ordinary protection applies. |
| Cortex Thief | Private starting briefings; Observe pre-attack facts | Observe pre-attack facts | Once; exact actual character. |
| Signal Saboteur | Private starting briefings; Commit control and delay | Commit control and delay | Nightly; never repeat a target during the voyage. Delay applies at delivery. |
| Wardbreaker | Private starting briefings; Commit control and delay | Commit control and delay | Suppress selected target’s ordinary protection. |
| Wreck Oracle | Private starting briefings | No later-night action | Three, four or five unused cards, according to setup; no nightly selection. |
| Signal Parasite | Private starting briefings; Private delivery and interception | Private delivery and interception | Once; copies eligible actual deliveries, including due older records. |
| Echo | Observe pre-attack facts | Night-start activation; Observe pre-attack facts | Copy a dead player once; activates next night at the copied power’s order. Expired opportunities do not restart. |
| Thrall | Observe pre-attack facts | Observe pre-attack facts | Once; true-allegiance check. Registers Crew to other allegiance investigators; no attack vote. |

## Script UI

A labelled Script button is available throughout a voyage. Character sheet lists the saved public candidate pool, quantities, allegiance, ability and timing. Night order has first/later-night reference views derived from the same schedule metadata. Never filter the Script by actual assignments, alive role owners, resources, jammed actors or tonight's choices; that would leak the hidden deal. The master catalogue still contains all 30 cards. Saving a new lobby briefing updates everyone's Script.

## In-person privacy

- No audible role calls, role-specific night button tones, visible wake progress or early night finish.
- Everyone keeps their phone close, tilted inward, and stays at their station until the shared deadline, even after submitting or with no active power.
- Optional Night watch offers the same neutral local alignment interaction to every seat, including dead players. It changes no game state, consumes no ability and sends no private action. It gives players something to do without making tapping evidence of a role.
- Private actions and Hollow choices remain in My orders; non-network clients never receive network state. Reports are not broadcast to the room.
- For strict privacy, use physical phone shields/privacy filters or screened positions. Software cannot stop a neighbour reading an exposed screen or guarantee that body language reveals nothing.

## Reference and adaptation

Official references: [Script Tool](https://wiki.bloodontheclocktower.com/Script_Tool), [Poisoner](https://wiki.bloodontheclocktower.com/Poisoner), [Monk](https://wiki.bloodontheclocktower.com/Monk), [Empath](https://wiki.bloodontheclocktower.com/Empath), [Storyteller Advice](https://wiki.bloodontheclocktower.com/Storyteller_Advice).

The useful principles are script-specific night sheets, disruption before dependent powers, protection before kills, and death-aware neighbour information. We retain Space Case's approved differences: silent suppression with no fabricated scan result, refunded jammed one-use powers, simultaneous private input, ordinary protected extra attack, and no private information for dead players. Do not import Clocktower's arbitrary misinformation, death-triggered exceptions or character-reset rules into this engine.

### Proposed secret Hollow mode (not implemented)
Captain selects N+K Crew candidates; bot deals N-H Crew plus H secret evil cards. Character sheet would show Crew candidates only; Night order would show selected Crew and every Hollow possibility. For 8 players, 11 Crew candidates and 2 evil means 5 unused Crew. Extra evil must use bounded, tested strength rules, never change after dealing. Backup count meaning and Oracle information require agreement before implementation.
