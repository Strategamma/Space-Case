# Runtime character rules

All 31 identities in public/roles.js are implemented. Original roster descriptions are in EXPANDED_ROSTER.md; complete target/timing/collision intent is in INTERACTION_CONTRACT.md. The implementation is server/abilities.js, with tests/abilities.test.js and the existing game/moderator/transport suites.

## Information and controls

My orders is the private card, action console and inbox. Starting identities/unused-card knowledge are delivered only after deliberate reveal. Night capabilities come from the server; daytime, dead, paused, unrevealed and spent states have no selectable targets. First-dark-cycle cards close after that cycle, Assistant automatically analyses dark-cycle attack casualties after revival, without selecting targets, Medic needs a recent corpse, and Void Reaver needs night 2+ with five alive. Once-use availability and passive defence are explicit. Clients cannot bypass these rules by sending commands directly.

Current actions appear before history. Modes distinguish mute from suspend voting. Living/dead target lists and exact target counts come from one authoritative capability function. Hollow special orders must be submitted/skipped before choosing a victim; selecting sends the collective choice immediately, unanimity seals it. Private station on the board is an entry point into My orders, not a second action form. Hollow names remain private; no collective target control exists during day.

Inheritance is announced at night start. Allegiance investigations use registration: Thrall reads Crew; its own check reads true allegiance. Exact-card inspections reveal actual roles. Scans/pair tests/dead records describe pre-attack facts; Proximity describes final dawn neighbours. Reports carry observed cycle and timing. Status instructions and Beacon confirmations are not investigative reports. Signal Saboteur delays only new investigative reports by one dawn; Signal Parasite copies only eligible actual deliveries, including due older records with original timestamps. Source identities and internal event keys are not transmitted.

## Resolution and lifecycle

Night-start snapshot and inheritance → unique Crew-only Jammer block → wards, suppression, stasis/control/delay commitments → pre-attack investigations → deduplicated collective/extra ordinary attacks in one death batch → revival if Medic survives → final-neighbour counts → due/fresh delivery and interception → final victory. No first-night killing. Established effects survive caster death except revival explicitly requires the Medic alive. Dead observers receive no new reports; queued records for a recipient who spent the night dead are discarded even if they revive at dawn. Revival preserves role, old information and spent charges; actions resume next night.

A Warden ward absorbs ordinary attack before Sentinel charge. Wardbreaker suppresses both for its target; the extra attack respects both. Jam suppresses a role's night power, not stored starting knowledge or ordinary voting, and refunds an elective once use. First-night opportunities do not retry. Committed valid once uses otherwise spend even if no useful result or later actor death. Night choices, queues, charges and resolution stamps persist. Duplicate deadline processing cannot repeat effects.

Muted players cannot speak but may nominate and vote. NO VOTE excludes them from the frozen eligible voter list. Threshold is half eligible rounded up, minimum one; no eligible voters means no ballot/execution. Stasis permits execution survival only with five alive immediately before execution and still spends the daily execution. Survival is not death, so no death card reveal or Auditor identity. Restrictions expire at next night start.

## Dealing and balance

Captains select exactly N+K Crew/special candidates, with K=3/4/5. They cannot add Hollow, including through forged settings. Ship Intelligence secretly selects H Hollow, 1..floor(N/3), and N-H authored candidates. At least one actual Hollow can attack. Copy limits and existing information/defence/recovery budgets apply. Weighted random sampling is bounded; a validated basic-Hollow fallback guarantees termination. Strength weights are provisional, not proven win probabilities.

Unused Crew/special candidates total K+H. Oracle learns these exact cards, and endgame reveals them; ordinary players do not. Public Script references every possible Hollow, not the selected roster. Legacy active games preserve their saved deal. New, edited, restored legacy lobbies and rematches use the automatic mode. See AUTOMATIC_HOLLOW.md.

## The Martyr — independent execution victory

The Martyr belongs to its own team, with one candidate copy maximum. It counts alongside Crew for setup and Hollow parity, but never shares a Crew/Hollow victory. An actual tribunal execution death with its power active immediately ends the voyage and awards only the executed Martyr one point, before ordinary victory checks. Nomination, votes or a protected execution without death do not qualify. Hollow attack deaths do not trigger this power. Static Jammer remains dark-cycle-only and cannot block the following light-cycle execution. A future light-cycle power block may silently suppress the trigger; there is currently no character that applies one. Ordinary signature investigations register non-Hollow; true-allegiance checks report Independent, exact inspections reveal The Martyr. Echo cannot copy it. See `characters/martyr.md` and its regression tests.
