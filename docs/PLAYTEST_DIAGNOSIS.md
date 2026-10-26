# Group playtest diagnosis — 26 October 2026

Investigation only. Canonical Git checkout: `game/Space Case`, HEAD `7024c03`. Hosted `/app.js` matched this checkout byte-for-byte during the investigation. The outer workspace contains a different, older client; do not use it for release fixes. Hosted server version and installed clients were not verified.

## 1. Light cycle one cannot proceed — unresolved

The client maps Open nominations → `nominations`, Confirm and close nominations → `execute`, Begin dark cycle → `night`. The server permits `night` only from `orders` or `aftermath`; closing nominations creates `aftermath` unless victory ends the voyage. A targeted test executed the actual UI action handler against the engine: discussion → nominations → aftermath → dark cycle 2 passed. The no-execution case passed. Existing ballot/execution and six-client full-voyage tests also passed.

The group clarified that tapping the mobile Command control had no noticeable effect on a Pixel and a Samsung (believed Chrome), and Open nominations could not be reached. These physical-device reports are not disproved by desktop emulation. Command is implemented as `scrollIntoView` on `.captain-controls`, not a tab/panel selection; it has no selected-tab state or explicit open/close feedback. Sticky command-panel positioning applies only at widths >=1450px, so it is not a phone-specific cause.

Follow-up browser check: local six-client voyage, actual Chrome with mobile/touch contexts. At 390×844, Command moved the nominations button from y=1630 to y=502; at 320×568, from y=1740 to y=260. Actual Open nominations click reached the nominations phase without page errors. Thus the reported failure remains unreproduced; do not describe a phase-engine or sticky-panel root cause as confirmed. No hosted game was created. Disconnection pauses reject phase commands, but that is not established as the group's cause.

## 2. Player count dropdown — confirmed design constraint

`settingsForm`, script editor, pool validation, launch-button disabling and server `start` all depend on manually saved `settings.playerCount`. Joining/leaving does not derive this setting from actual playing seats. A valid pool can become incompatible with the crew, requiring another count/script/save cycle. Form draft preservation can also retain the earlier selection after another player joins. Future implementation should derive the count from playing seats, including the Captain only when playing, and display the required candidate total.

## 3. +3/+4/+5 — confirmed configurable rule

Both briefing and editor expose `spareCards`; pool generation, validation, deal and reference honor it. This is deliberate functionality, rather than randomizer malfunction. Fixing at +3 requires coordinated UI/server validation and legacy-active-match compatibility, including Oracle unused-card semantics. Candidate count is players + 3; actual unused candidates also include those displaced by secret Hollow cards.

## 4. Character documentation — confirmed readability problems

`cardTile` mixes description, timing and collapsed `roleWiki` detail. CSS sets description to 12px and muted timing to 10px. Wiki headings/list text are 13px. Editor descriptions are clamped to three lines and shrink to 11px on mobile; the editor has no per-character detailed-reference control. Dense content and weak hierarchy contribute to discoverability/readability problems.

## 5. Private reports in My orders — clarified

The group confirmed this means private reports, not the public Ship log; the main concern is unintuitive information ordering for first-time players, beyond typography. `ordersContent` places the report list below identity, guidance, restrictions and action sections. Reports are one reverse-chronological list with no grouping by observed cycle, report type or current relevance. Cycle/timing metadata uses 8px text; report body uses 12–13px text. `private-report p` preserves line breaks but otherwise displays each report as one text block. Focus a future layout change on private report hierarchy, readable metadata and distinguishing new/current reports from history while preserving server filtering.

## 6. Rejoining by room code — reproduced

Active-voyage Leave retains the browser's boarding pass. However, submitting the code runs `chooseAvatar` → `inspect`, which rejects launched rooms before recovery is attempted. Direct `join` also rejects launched rooms. Automatic `resume` runs on socket connection, not when the code is entered after an explicit Leave; current guidance requires reloading.

Six real socket clients confirmed: Leave succeeds; inspect and join fail; resume with the saved token restores the identical seat/role and clears the connection pause. Route matching room-code entry through saved-pass resume before inspecting avatars. Never reclaim private assignments by name/code alone. Lost storage or another device needs a separate authenticated recovery design.

## Verification limits

All 256 existing tests passed, including full-voyage transport and reconnect/restart tests. Targeted handler/engine and six-client rejoin probes passed as described. Runtime was Node 25.6.0; project target is Node 24. Follow-up mobile browser Command/Open nominations clicks passed at 320px and 390px. No physical-phone, installed-PWA or hosted multiplayer test was performed. No game code or deployment changed.

Implementation preparation: see PLAYTEST_CHANGE_PLAN.md and REJOIN_AUDIT.md for the agreed direction, recovery branches and verification requirements.
