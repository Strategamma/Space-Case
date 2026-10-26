# Playtest change plan — 26 October 2026

Status: implemented locally as 1.0.2; deployment and physical Android verification pending. Source diagnosis: PLAYTEST_DIAGNOSIS.md. Pixel and Samsung failures are user-reported physical-device evidence; desktop Chrome mobile emulation passed and does not invalidate them.

## Goal

Make a first voyage understandable, expose Captain actions reliably on Android, remove redundant setup counts, and recover an existing seat without losing identity or private information.

## Scope and approach

### Command and phase progression

Replace the mobile Command scroll shortcut with a real view selection and visible selected state. Render one instance of Captain controls; preserve nomination/settings drafts across view changes and state broadcasts. Crew board must select Crew, not merely scroll the currently selected Script/log view. Keep the Captain's current phase action near the top, with pause/offline reasons beside disabled actions. Reuse authoritative nominations/execution/night commands; do not bypass voting or phase rules.

The exact Pixel/Samsung failure remains unreproduced. Check touch event delivery, console errors, current host identity, installed/cached client version, viewport/browser chrome and overlay state on target devices. Avoid attributing it to sticky positioning: that rule applies only >=1450px. Release must update the complete versioned PWA shell and make the running build identifiable without exposing credentials.

### Player and candidate counts

Remove both player-count dropdowns. Server derives N from playing seats, including a playing Captain; a non-playing Captain is excluded. Recompute on join, lobby removal/leave, host playing toggle, succession and rematch. Disconnect does not remove a seat or change N. Snapshot N at launch; no active-match resizing. Retain current 6–15 rule.

Show “N players · select N + 3 Crew/special candidates” and remaining selections in briefing/editor. Handle fewer than six players as a waiting state, not a failed randomizer. Preserve deliberate character choices as the lobby changes: adjust Cadet filler where legal; if remaining special selections exceed the new budget, show exactly how many must be removed and offer explicit randomization. Validate current N and pool atomically on Save/Launch; stale drafts must refresh requirements without losing edits.

Remove +3/+4/+5 controls and enforce exactly +3 for new/edited/rematched lobbies on the server, including forged requests. Update Script, handbook and error copy. Actual unused candidates remain 3 + secret Hollow count; preserve Oracle secrecy. Existing active games retain their original deal, pool and counts. Restore/migrate legacy lobbies to +3 without silently changing active games.

### My orders and character help

Sequence by phase and player need, not implementation order:

- Initial reveal: identity/allegiance and plain goal → concise power/timing → starting information → acknowledge.
- Dark cycle: what to do now and deadline → actionable ability → shared Hollow action when eligible → current relevant information → collapsed older reports/help.
- Light cycle: new reports with observed-cycle labels → what the result means/next step → current restrictions → older reports → character help.
- Dead/paused/offline: clear state and permitted next step first; history remains accessible without suggesting legal actions.

Use readable text, separate current reports from history, distinguish observation cycle from delivery timing, and avoid repeated power explanations. Capture unread IDs before opening; opening/refreshing the modal must not mark unseen reports below the fold as read. Preserve scroll, focus, in-progress targets and report expansion on updates. Keep server text/projections authoritative; do not invent investigation conclusions. Character help gets clearly labelled goal/power/when/limits sections with readable full text.

### Rejoining

Implement the recovery matrix in REJOIN_AUDIT.md. Begin with room-indexed local passes, explicit Return to voyage, matching-code resume before avatar inspection, typed server error codes and retry without deleting valid credentials. New players still cannot take occupied active seats. Offer deliberate private pass export/import for moving browsers/devices; never authorize by callsign or room code. No PostgreSQL migration is required by this plan; restart recovery depends on durable existing snapshot storage.

## Risks

Private-seat theft; multiple live sockets; stale form budgets; loss of selected roles; active legacy migration; accidental replays of ballots/abilities; PWA mixed versions; Android viewport/overlay behavior. Preserve authoritative roles, ballots, reports, spent powers and Captain succession.

## Verification

Targeted engine and six-client transport checks for counts/+3/migrations and every recovery branch; browser checks for new-player content order, unread reports, Command/phase controls, draft retention and no duplicated controls at 320/390px. Full npm run check and npm test on Node 24 after implementation; versioned PWA graph and old-client update checks. Physical Pixel Chrome and Samsung Chrome: Command → Open nominations → ballot/close → next dark cycle, returning after Leave/reload/background/network switch. Hosted multiplayer and installed-PWA checks follow deployment; desktop emulation alone cannot close the Android issue.

## Local verification result

Node 24.13.0: syntax/catalogue check passed; full 263-test suite passed, followed by the additional explicit-update worker test and targeted recovery/PWA tests. Actual Chrome touch contexts passed at 320×568 and 390×844: visible Command/primary action; nomination, Captain ballot, combined result, continuation and next dark cycle; code-entry seat restoration; deliberate screen takeover. Separate browser checks passed for phase-led private reports, readable body text, unseen reports remaining unread, private-pass transfer into isolated browser storage, a late join preserving the script draft, and non-host mobile pass backup/Leave. Screenshots inspected locally; QA artifacts remain outside the repository.

No hosted voyage, physical Pixel/Samsung test, installed-phone PWA update or PostgreSQL integration test was performed. A surviving private pass cannot restore a server-lost/expired voyage. Lost credentials without a backup still cannot safely identify a seat.

## Ballot visibility update

User requested public participation and individual reveals only after everyone submits. Implemented a server-filtered ID/status roster while open, completed per-person ballot records, card flips and explicit block/threshold/tie/lower-total verdicts. Discussion/dark countdowns remain; voting adds an elapsed clock with pause/completion handling and no forced choice. Earlier aggregate-only screenshots/wording describe the prior design. Local Node 24 suite and 320/390px six-client browser checks pass; live/device verification is still pending.
