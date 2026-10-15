# Space Case: 30-character design

Status: all 30 identities implemented in the server and My orders. Automated rule checks and browser verification are recorded in docs/QA.md; this is not a claim of exhaustive combinations or calibrated group balance. Original Space Case names, lore and wording; reference games inform mechanical categories, not copied card text, art, logos or character identities.

**Interaction authority:** docs/INTERACTION_CONTRACT.md defines targets, anonymity, timing, pairwise collisions, higher-order cases and implementation gates. Where this overview is less specific, use that contract.

## Design contract

19 Crew, 11 evil identities; a match still has only 6–15 players and N+K candidate cards (K=3, 4 or 5). Specialist cards unique, except repeatable Engineers; Cadets and basic Hollow repeat. True evil allegiance governs parity/victory. Thrall registers as Crew in allegiance investigations and has no network or attack vote; other evil specialists participate in the ONE unanimous collective attack. No conversion, arbitrary false information, player-defined questions or human moderator judgement.

All information is computed by server rules. The theatrical GOD bot may present fixed messages; an LLM must never choose facts, targets, outcomes or whether a power worked. Character flavour never changes semantics.

## Crew

| # | Space Case identity | Rule | Private output |
|---|---|---|---|
| 1 | Cadet | Existing: no special power. | No starting information. |
| 2 | Xenobiologist | Existing: nightly choose another living player; actual allegiance. Repeat targets allowed. | “Nova: Hollow.” / “Nova: Crew.” |
| 3 | Signal Analyst | Existing: nightly choose two distinct other living players; whether either is Hollow. | “Nova + Mira: at least one Hollow.” / “Neither is Hollow.” |
| 4 | Linked Engineer | Each night from night one, inspect two other living players. | At dawn, privately name selected Engineer matches, or report neither; no automatic starting knowledge. |
| 5 | Observatory Officer | Existing: reveal identifies assigned Xenobiologist, or absence. | Actual name or “No Xenobiologist was assigned.” |
| 6 | Research Assistant | Passive at light-cycle start: whether any current dark-cycle casualty registered Hollow. | No casualties explicit; no target identities; executions excluded. Survive/jam/delay/interception rules apply; death reveals off. |
| 7 | Beacon Operator | Existing: first-night choose an adjacent playing berth; recipient, even Hollow, learns sender's identity and Crew allegiance. | To recipient: “Mira is the Beacon Operator, loyal Crew.” |
| 8 | Resonance Officer | Once/game from night one, choose two distinct other living players. Compare actual allegiances, without identifying either. | “Nova + Mira: same allegiance.” / “Different allegiances.” |
| 9 | Warden | First-night choose another living player. That fixed player is protected from ordinary collective attacks each night while Warden lives. No retarget after either dies. Jam suppresses the ward that night, not the stored choice. | “Ward linked to Nova.” No feedback about attacks. |
| 10 | Reclamation Medic | Once/game, nightly choose one player who died since the previous dawn, including that day's execution. Revive at next dawn if Medic survives. Any allegiance allowed. Cannot act after victory or while dead. | “Nova revived.” Revival is also public. |
| 11 | Comms Arbiter | Each night choose one living player, including self, and MUTE or NO VOTE for following day; may pass. Mute blocks speech only, not nomination or voting. | Public board/log show restriction and expiry at dawn; source hidden. |
| 12 | Proximity Analyst | At each dawn, count Hollow among nearest distinct living neighbours clockwise and anticlockwise, skipping dead seats. | “Your living neighbours: 1 Hollow.” Names of evaluated neighbours included. |
| 13 | Orbit Surveyor | At first dawn only, count adjacent Hollow-Hollow edges around original circular playing-seat order. Each edge once, including last–first. | “Initial manifest: 2 adjacent Hollow pairs.” No identities. |
| 14 | Tribunal Auditor | Each night after an actual execution death, learn that player's exact character, even if public reveal is off. No death means no identity report. | “Executed today: Nova — Static Jammer.” |
| 15 | Memory Diver | Once/game at night, choose any dead player; learn their exact actual character. Reader must survive dawn. | “Mira's personnel record: Warden.” |
| 16 | Hull Sentinel | Automatically survive first ordinary attack against self, collective or extra. One charge/game; no protection from execution. | “Hull defence absorbed an attack.” Only if alive at dawn. |
| 17 | Cryo Guardian | Once/game at night, choose one living player, including self. That player survives next day's execution if at least five were alive immediately before it. Execution allowance still spent. | Actor: “Stasis field queued.” Public survival if triggered, no source. |
| 18 | Cartographer | Once/game at night, select three distinct other living players. Learn exact Hollow count among them. | “Nova + Mira + Atlas: 1 Hollow.” |

Resonance Officer implements the user's Apprentice Seer brief; it does NOT replace Signal Analyst's existing OR test. Warden implements a fixed first-night ward rather than silently turning it into nightly retargeting. Medic and Comms Arbiter follow the user's supplied variants, regardless of differences between online editions.

## Hollow

All ten recognise their living teammates and participate in the collective attack. Extra powers use a separate clearly labelled private station order. Submit or skip that order BEFORE choosing a collective victim. Teammates' victim selections still stream immediately; unanimity locks the victim and all special orders. No later edits. First night: special powers only, no collective or bonus kill.

| # | Space Case identity | Extra power | Private output / limits |
|---|---|---|---|
| 19 | The Hollow | Existing collective attack, no extra power. | Teammate choices and locked victim. |
| 20 | Static Jammer | Nightly choose a living Crew member; suppress their night power, including passive night defences, for that night. Never fabricates a result. Cannot target fellow Hollow, avoiding blocker cycles. | No suppression notice to target; no fabricated result. Jammer sees order received, not target role. |
| 21 | Dreadcaster | Nightly mute another living player for next day; cannot target same player on consecutive nights. | Target sees speech restriction; voting/nomination unaffected. |
| 22 | Ballot Leech | Once/game at night, remove another living player's voting eligibility for next day. | Target sees “Voting suspended until next dark cycle.” |
| 23 | Void Reaver | Once/game from night two with at least five alive, choose a living Crew member for an extra ordinary attack. Warden/Sentinel protect; shared victims receive one attack. | Order confirmation only. Public death at dawn; no killing-source reveal. |
| 24 | Cortex Thief | Once/game at night choose another living player and learn exact actual character if thief survives. | “Nova — Reclamation Medic.” |
| 25 | Signal Saboteur | Each night choose a living Crew member never targeted before this voyage. Delay their new investigative reports by one dawn; preserve factual content and observation time. No effect on starting knowledge, Beacon or status instructions. | Target gets generic delay notice without source. Dead recipients never receive queued reports. |
| 26 | Wardbreaker | Nightly choose a living Crew member. Remove all their ordinary collective-attack protection that night, including Hull Sentinel. Does not block scans or execution protection. | Order received; no disclosure of whether target had protection. |
| 27 | Wreck Oracle | At initial character reveal, privately learn exact configured unused cards. Never sees the full role-to-player map. | Names of the actual unused cards, including duplicates. |
| 28 | Signal Parasite | Once/game at night choose a living Crew member. At dawn copy only successful new allegiance/role/count reports delivered to that target that cycle, if parasite survives. No historical, teammate-network, status or action-confirmation messages. | Exact copied messages, or “No eligible report received.” |

## Fixed resolution and collision rules

1. Night-start snapshot: living actors, targets, seats and charges. Expire previous light-cycle restrictions.
2. Collect validated actions or explicit pass. Server deadline, not client time, closes orders. Special powers do not bypass Hollow unanimity. No missing input causes a random target.
3. Resolve Static Jammer's block (Crew-only, unique). It cannot change starting reveal knowledge or collective-attack votes. Record blocked effects explicitly. Refund a blocked elective once/game use; automatic charges are spent only if triggered. Only one blocker exists, so no circular cancellation.
4. Establish night wards, Wardbreaker suppression and next-day restrictions/stasis. Actor must have been active at step 1 and unblocked. Committed wards/control last their stated duration even if caster later dies that night. Warden's continuing ward expires for future nights if Warden dies; an already-established ward protects this night's batch.
5. Calculate pre-attack scan/pair/cartography/record reports from the validated snapshot. Targets dying in step 6 do not retroactively invalidate truthful observations. Missing or blocked scan produces no allegiance claim.
6. Resolve collective and Void Reaver attacks as one death batch, deduplicating shared victims. Both respect Warden/Sentinel protection. First-night kill embargo applies to all sources. Sentinel charge triggers only on an ordinary attack it actually blocks; suppression does not consume it.
7. Revive recent-death target chosen before night, only if Medic remains alive and active. Newly killed targets were not eligible during collection and cannot be selected retroactively. Revived players retain allegiance, role and spent charges. They may speak/nominate/vote that day, but get no action or passive report from the night they spent dead. Starting identity knowledge already received is retained; powers resume next night.
8. Compute dawn Proximity counts on surviving/revived neighbours, after the death batch and revival. Orbit Surveyor uses original night-one snapshot. Deliver truthful typed reports only to surviving entitled active actors/recipients, applying Signal Saboteur delay to new eligible investigations and releasing due reports with original observation timestamps; then Signal Parasite gets explicit authorised copies of eligible already-delivered reports. No report reaches a dead observer. Distinguish “as scanned before attack” from “neighbours at dawn” in UI.
9. Apply public deaths, revivals and speech/vote restriction badges without naming sources. Evaluate victory once final life state settles. No resurrection after a game already ended. Every new final private report or status updates My orders notification; order edits do not create repeated unread alerts. Hollow effects never name their hidden source.

Specific exceptions are written on cards, never invented by bot discretion. Once/game elective charge is spent when a valid unblocked effect resolves, even if target would survive anyway or no eligible intercept message exists. Forger delay and Parasite eligibility follow INTERACTION_CONTRACT.md. A dead recipient gets no result; that does not refund the user's spent ability. Revival failure because Medic died spends its unblocked committed use; dead Medic cannot retry anyway.

## Voting and in-person control

Mute is enforced socially by the target's explicit instruction plus public speech-restricted badge; the app cannot monitor room conversation. Muted players may nominate through Captain-recorded actions. NO VOTE disables ballots server-side. Freeze living eligible voter IDs at ballot open. Threshold ceil(eligible/2), minimum one; with zero eligible voters, skip ballots and allow no execution. Secret immutable ballots, self-nomination, tied-highest cancellation and one execution/day remain. A protected execution uses that daily execution even though nobody dies; no death means no public role reveal.

## Moderator engineering contract

Each role declares team, timing, target predicate, count, choices, limits, charge, prerequisites, effect operations and message templates. Client report IDs must be opaque; hidden caster IDs and cause chains remain server-only. Team checks must use allegiance, never `role === hollow`; the runtime now classifies all eleven evil identities by true allegiance, with separate scan registration/attack membership. Use typed effects (block, ward, mute, disenfranchise, kill, revive, inspect, copy-report), a fixed resolver and stable event IDs. Persist choices, used charges and resolved cycle IDs transactionally before broadcasting. Retry/reconnect must not reroll information, spend twice, revive twice or repeat points. Do not send all secrets to browsers or a playing Captain.

True world state, recorded observation time and rendered message are separate. Messages are generated from structured results, never parsed back from flavour text. “Different allegiance” and “at least one Hollow” are separate result types. Interception copies explicitly whitelisted structured reports, not arbitrary private logs. Role reveal on death does not suppress entitled investigative information.

Required tests: each role's normal/pass/invalid/blocked/dead case; every pair of interacting effects (ward × pierce, block × ward/revive, death × report, revive × parity, suppression × Sentinel, control × voter denominator, parasite × recipient survival); duplicate commands; restart/reconnect during resolution; candidate/dealt/unused secrecy for each Captain mode. Validate invariant no dead actions/new dead-recipient reports, no first-night kill, no zero-Hollow deal, no immediate parity, no duplicated reports/charges/points.

## Balance and usability

Do not simply give every evil role basic-Hollow weight: Void Reaver and Jammer differ greatly from Wreck Oracle. The runtime now adds category budgets and matchup constraints to the strength heuristic. At 6–7 players allow the protected extra attack, cap hard information/confirmation and recurring protection; require at least one operative Crew information role. At 8+ use separate information, defence, recovery, control, evil-disruption and lethality budgets. Reject pools with no acceptable N-card deal, but do not expose which cards would be unused. Every permitted outcome must pass structural constraints; sampled valid outcomes must preserve actual-Hollow-count uncertainty where pool permits it. Numerical quotas cannot prove equal win probability. Calibrate from completed-match data by size/roster, not invented success percentages.

Offer beginner and advanced curated presets without removing host choice. Mark high-complexity cards and incompatible modes before Save. Tribunal Auditor is redundant when exact death reveal is on: warn or omit from presets. Memory Diver is weak in that mode too. Only the Officer depends on the Xenobiologist; Assistant is independent casualty analysis. Advanced count/confirmation powers cannot all be packed into a tiny game just because faction numbers are legal. Include controls for mute/no-vote selection and separate Hollow bonus-order/collective-victim controls; never auto-open secret information.

## Research provenance

Official Clocktower reference pages read: [Empath](https://wiki.bloodontheclocktower.com/Empath), [Chef](https://wiki.bloodontheclocktower.com/Chef), [Undertaker](https://wiki.bloodontheclocktower.com/Undertaker), [Soldier](https://wiki.bloodontheclocktower.com/Soldier), [Professor](https://wiki.bloodontheclocktower.com/Professor), [Monk](https://wiki.bloodontheclocktower.com/Monk), [Assassin](https://wiki.bloodontheclocktower.com/Assassin), [Poisoner](https://wiki.bloodontheclocktower.com/Poisoner), [Devil's Advocate](https://wiki.bloodontheclocktower.com/Devil%27s_Advocate), [Spy](https://wiki.bloodontheclocktower.com/Spy), [Witch](https://wiki.bloodontheclocktower.com/Witch), [Chambermaid](https://wiki.bloodontheclocktower.com/Chambermaid). These are inspirations, not exact implementations. In particular poison/drunkenness, arbitrary registration, story-dependent madness and death-information roles are excluded to preserve factual reports and dead-player privacy.

User-supplied Werewolf links were attempted; Fandom blocked full-page access, and indexed snippets mix editions/variants. User's six supplied ability descriptions are the design authority here. Do not present those variants as independently verified identical source rules. This design uses original prose and names; no trademark clearance or legal originality assessment has been performed.

## Engineer diagnostic

Implemented: nightly from night one, choose two other living players. At dawn identify all selected Engineers, or explicitly report neither. No automatic partner/absence information. Jamming blocks only the current night’s diagnostic. Reports support delay, interception, and surviving-recipient delivery. The first pool click adds two; later clicks add one, removal goes down to two then zero. Actual assignments can include a lone Engineer.

## Echo and Thrall (implemented)

- Echo (Crew): once/game at night, choose any dead seat, without filtering by hidden role/allegiance. Invalid Echo/evil target spends use and says only “Nothing happened.” Valid Crew ability/resources copied before revival activate next night. Echo remains Crew and exact inspections still reveal Echo. Spent one-use/Sentinel charges stay spent; fixed ward state persists. Starting knowledge/expired first-night windows do not restart. Jam silently preserves copying use. Copy/activation are private status reports; copied investigations follow delay/interception rules. Dead Echo gets no new pending role disclosure. Multiple Warden/Medic powers resolve independently.
- Thrall (evil): appears Crew to Xenobiologist, Analyst, Resonance, Cartographer, Proximity and Surveyor. Exact-card inspections reveal Thrall. One night check of another living player's true allegiance. No starting network, teammate list, shared victim choices or attack vote; may act after network consensus. Counts evil for quotas/parity/scoring; actual deals require another attack-capable Hollow. Non-network hostile target lists include Thrall to avoid exposing it by exclusion.
