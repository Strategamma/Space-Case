# The Martyr

Stable ID: `martyr`. Proposed thematic replacement for Tanner. Separate allegiance: `martyr`; no Crew/Hollow victory or network membership. Main library, one copy maximum.

Goal: persuade the tribunal to execute you. Passive execution-death trigger; no night target or action. Mere nomination, Execute votes, being placed on the block or a protected execution that leaves you alive does not trigger victory.

When the tribunal actually executes an unblocked Martyr, end the voyage immediately. Only that Martyr wins and receives one point; no Crew/Hollow teammate awards. A Hollow attack death never activates the power. If blocked on the execution day, the Martyr dies normally with no special victory and no private suppression notice; normal game victory checks continue.

Confirmed rules: counts alongside Crew for setup/parity but belongs only to team `martyr` for victory/scoring. Static Jammer remains dark-cycle-only; its suppression never extends to this light-cycle power. No existing role blocks powers during the light cycle. The execution engine reserves private `status.abilityBlocked` for a future light-cycle effect; absent means active and `openNight` clears it.

Ordinary Hollow-signature scans/counts register non-Hollow; Resonance uses that existing registration. Thrall true-allegiance checks report Independent. Exact inspections reveal The Martyr. No independent starting reports or action selection.

Interaction checklist for implementation:
- Protection preventing death: no execution-death trigger.
- Jam: dark-cycle suppression has no light-cycle effect. A future daytime block remains server-private, survives snapshots and expires next dark cycle.
- Revival: does not itself trigger victory or change allegiance.
- Echo: may copy Crew powers only; never grant the Martyr's independent win to Echo.
- Investigations: non-Hollow registration, Independent true allegiance, exact identity Martyr.
- Delay/interception: no personal report for execution success or blocked trigger.
- Save/restore/rematch: preserve relevant passive state, clear it on rematch.
- Setup: at most one Martyr; preserve minimum real Crew and at least one actual Hollow attacker.
- Tests: real ballot/execution, attack death, protected execution, blocked execution, scoring once, privacy, restoration, expiry, rematch, parity and no-Martyr regression.

Integration: `roles.js`, main library/editor/Script Independent faction, one-copy `CARD_LIMITS`, explicit zero strength weight, routine night schedule, guide, passive execution handler, individual winnerId and final reveal. No separate experimental list. Candidate strength is provisional and needs table playtesting.

Verification: `tests/characters/martyr.test.js` covers actual ballots, attack deaths, night jamming, silent day-block hook and expiry, Cryo protection, tied ballots, parity/scoring, scan identities, Echo rejection, Medic revival, restoration and rematch. Shared catalogue/lifecycle gates include this character. Existing non-Martyr rules stay unchanged. Browser card/setup/solo-victory checks and full release suite are recorded in the task handoff; deployed and physical-device checks remain separate.
