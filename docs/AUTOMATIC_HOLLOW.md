# Automatic Hollow selection

## Confirmed game rules

- Captain chooses N+K Crew/special candidate cards; K is 3, 4 or 5. Hollow cards cannot be selected manually or submitted through settings.
- Ship Intelligence secretly chooses H, between 1 and floor(N/3), and legal Hollow types. It deals those H cards plus N-H authored candidates. At least one actual attacker is required; Thrall cannot be the only evil.
- Authored pool remains public. The actual enemy roster/count never appears in settings or the public reference. All possible Hollow appear in Script/library/night-order references so those pages do not reveal which were dealt.
- Unused cards are all authored candidates not assigned: K+H. Example: 8 players, 11 candidates, 2 Hollow means 6 candidates used and 5 unused.
- Oracle learns exact unused Crew/special candidates, and can consequently infer H from the unused count. That entitlement is deliberate. Other ordinary players do not receive unused cards before endgame; an overseeing Captain already has full assignments.

## Implementation

`crewPoolError`, `suggestCrewPool`, `randomCrewPool` and `findCrewDeal` in public/setup.js support authored pools. Server validateSettings always applies these rules, ignoring a client's attempt to disable automatic selection. New defaults contain no selected Hollow.

`dealAutomaticHollow` in server/moderator.js uses cryptographic random sampling, actual copy/faction/attacker/strength constraints and existing deal weights. Sampling is capped at 128 attempts; validation finds a legal authored subset with basic Hollow for guaranteed fallback. This is a bounded strength heuristic, not an estimated win-rate optimizer.

Legacy mixed-pool helpers remain for saved matches and regression fixtures. Existing active rooms retain their deal/settings. Restoring an old lobby or requesting a rematch removes manually selected Hollow, replaces those slots with Cadets, and validates the new pool (falling back to a legal suggestion if necessary). Newly saved settings always use automatic selection. No active room is redealt.

## Verification and limits

`tests/automatic-hollow.test.js` checks every player count 6–15, each K, both reveal settings, seeded and adversarial selectors, candidate conservation, quotas/copy limits, server-side rejection, private projections, Oracle entitlement, old snapshots and rematches. Existing legacy dealer/ability tests remain. Transport tests exercise automatic launch, multiple-enemy tribunals, scoring, rematch and 15-player secrecy. PWA tests check imports/shell; phone editor checks cover randomize/apply/save without Hollow controls.

Deployment, physical-device group play and balance acceptance remain separate from local tests.
