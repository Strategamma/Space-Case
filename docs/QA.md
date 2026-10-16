# First-build verification — 2026-10-15

## Verified locally

- `npm test`: 28 passing tests covering dealing, player bounds, Captain permissions, secret-state projection, acknowledgements, unanimous Hollow lock, invalid/late targets, role timing, death restrictions/reveals, vote thresholds/ties, final secret ballots, nominations, executions, both victories, dead-teammate points, rematches, pause/reconnection and consensual succession.
- Built-in Node WebSocket test uses six real transport clients against a fresh server, rejects invalid seat credentials, reconnects the Captain, restarts the process, and restores identities/roles from the local snapshot file. This verifies local atomic persistence, **not live PostgreSQL**.
- Every PWA shell resource and declared icon returns success. Bundled font MIME type is checked.
- `npm run check`: JavaScript syntax checks pass.
- Browser: one visible playing Captain plus five scripted WebSocket seats completed boarding → sealed orders → first night → discussion → self-nomination → six secret ballots → public total → execution → Captain death → Crew victory/points → rematch. **Not six physical players/devices.**
- Fifteen-player visual preview inspected at 320×568, 390×844, 768×1024 and 1600×1050. Bounds checks at 320/768/1600 show no horizontal document overflow. Phone screenshots reviewed for orders, night, tribunal, death and victory. Two-column phone berths and fixed shortcuts; expanded tablet/desktop layouts.
- Final browser console review: no errors/warnings. Field guide has an accessible label when its text is hidden. Editable callsign and Forget name exercised.
- Ship and crew art visually inspected and WebP atlas checked in-game. Eight portraits repeat across fifteen seats in this build.

## Evidence

Generated screenshots in ignored `output/ui-qa/`: boarding-320.jpg, board-320.jpg, board-tablet.jpg, board-desktop.jpg, death-mobile.jpg, victory-mobile.jpg. Art prompts/provenance: UIUXVisions.md.

The prescribed develop-web-game Playwright client was attempted but its browser executable is absent. Browser checks used Codex's in-app browser. No native browser/device claim follows.

## Required before publication

- User visual review, final role/timing acceptance, real-group balance sessions; Echo/Thrall require defined interactions and tests.
- Physical iOS/Android touch, keyboard, safe-area and background/resume; actual tablet/PC interaction checks beyond viewport simulation.
- Installed PWA launch, offline repeat visit, update activation, real network drops and Captain succession. Static shell checks do not establish installed PWA correctness.
- GitHub remote, actual Render deployment, HTTPS/WSS two-device join, hosting availability, live PostgreSQL snapshot/restart/reconnect and realistic storage faults.
- Production load review. Architecture intentionally uses one active server instance.

No live deployment, installed PWA, physical LAN, or physical-device verification is claimed.

## Avatar update

31 tests now pass, including explicit avatar validation/exclusivity, sixteen-seat capacity, legacy migration, release/reuse, live availability with competing claims, and identity after server restart. Browser create/join flow verified selected avatar 12 on the board; another joiner saw it disabled as Taken and boarded with avatar 1. All sixteen options were present at 390px with no horizontal overflow. Revised young-adult artwork inspected in the picker. Screenshots: output/ui-qa/avatar-picker-mobile.jpg and avatar-picker-desktop.jpg. Original physical-device/deployment limits above still apply.

## Possible pool and Computer Moderator update

39 tests pass. Tests enumerate valid pool boundaries for every supported player count, preserve the selected card multiset, leave exactly three cards unused, and prove extra Hollow can be unused or dealt. Legal actual teams have 1..floor(N/3) Hollow and at least two-thirds loyal Crew. Playing Captains cannot see unused cards or actual assignment counts. The server withholds an unrevealed player's own role/starting reports and requires reveal before acknowledgement. Recipient-specific report tests cover Hollow links, absent/solo Engineers, absent Xenobiologist, scans, analysis, beacon routing, duplicate delivery, and dead recipients. Existing ability-scenario tests now use fixed test assignments; random production dealing is tested separately.

Browser verification used a separate QA origin/room without changing the user's existing crew: setup count changes disabled invalid pools, filling Cadets restored a valid N+3 budget, and six clients launched from a nine-card pool. The playing Captain explicitly revealed Xenobiologist; a first-night scan of Nova produced a private Hollow result after dawn, matching Nova's actual QA card. Browser console was clear. The full eight-card library was inspected at actual 320px width with no horizontal overflow. Echo/Thrall are clearly marked planned. Screenshots: card-library.jpg, card-library-mobile.jpg, moderator-private-reveal.jpg, moderator-night-report.jpg. Physical-device and production limits remain unchanged.

## Good/Evil pool and strength weighting
40 tests passed, including conditional information weights and legal random deals across 6–15 players; syntax checks passed. Browser verified add/remove, editor faction switching without losing draft, save and public Evil roster, full library filters. Original user roster unchanged. Mobile 390×844 library and host editor inspected visually with no horizontal overflow; screenshots in output/ui-qa/good-card-library.jpg and host-pool-mobile.jpg. Dealer weights are provisional; equal win rates and physical devices remain unverified.

My orders notification: targeted checks cover unread/read/new reports, inherited scan, match isolation, lobby and spectator exclusion. Browser preview verified dot appears, clears on opening, and remains cleared on reload. Syntax checks passed. Dot appears in desktop and mobile orders labels; no secret text is stored in read markers.

## 28-role engine and phase-aware My orders

98 automated tests pass: existing game/moderator/six-client transport recovery plus 58 new ability checks. Every character is checked for closed daytime/dead/paused/unrevealed capability states. Positive cases cover target counts/life/self/modes, specialist allegiance, charges, first-night safety, Warden/Sentinel/Wardbreaker/piercing collisions, jam/refund/privacy, revival/parity and inherited powers, final neighbours, starting Oracle, mute/no-vote thresholds, Stasis execution survival, historical delay/interception, source-free IDs, repeated resolution and JSON recovery. These are bounded scenario tests, not a proof of every combination or 50/50 balance.

Live browser QA used independent 127.0.0.1 room 0C21FA with five scripted Socket.IO peers, preserving the user's localhost room. Selected specialist pool and deliberate character reveal. Actual Captain was Xenobiologist; nightly Atlas/Jules scans remained sealed until dawn and returned correct Hollow signatures, including Static Jammer. Daytime and postgame My orders had zero target buttons; night reopened them. Three cycles, collective deaths, Hollow parity victory and both evil team points completed. Closed-inbox new report showed dots on desktop/dock controls; opening cleared both. Browser reported no warning/error logs. Desktop and 390px live orders inspected; 320px/390px Hollow visual-preview console inspected for clipping/overflow. Evidence: output/ui-qa/my-orders-live-night.jpg, my-orders-mobile-day.jpg, my-orders-mobile-night.jpg, my-orders-hollow-mobile.jpg, my-orders-hollow-320.jpg. The narrowest target layout was refined to keep callsigns readable. Preview is visual evidence, not a second live gameplay test.

Shared browser role/setup modules are revisioned with app/CSS/cache to avoid mixing stale role metadata into a new shell. Local server is single authoritative instance; mutations serialize and snapshots save before broadcast, with failed command/deadline snapshot rollback. Actual database failure injection, public Render restart, installed PWA/update/offline fallback, physical devices and extended human balance sessions remain unverified. Native Playwright browser executable remains unavailable; in-app browser supplied visual/live checks.

## Engineer pair review
100 tests pass, including all supported player counts admitting zero or two dealt Engineers and rejecting singletons. Browser verified first add selects two, explicit pair/dealt requirement and remove selects zero; original lobby edits were reverted without saving. Existing saved lone-Engineer information is retained for compatibility. Actual completed QA voyage scan history was opened and captured in output/ui-qa/scan-information-review.jpg. Engineer ability remains initial mutual confirmation pending balance redesign; proposed once/game diagnostic is documented, not enabled.

## Engineer singleton correction

Supersedes the pair-dealing restriction above: paired candidate selection remains, but zero, one or two Engineers may be assigned. Regression coverage checks all supported player counts and the lone Engineer's private no-partner briefing.
Validation: all 100 tests and JavaScript syntax checks pass.

## Engineer two-target diagnostic

105 tests and syntax checks pass. Tests cover first-night zero/one/two matches, private dawn delivery, once-use, jamming refund, delayed transmission, death withholding, independent Engineers and larger pools. Browser verified roster clicks 0→2→3 and removal 3→2→0; unsaved edits restored. Screenshot: output/ui-qa/engineer-diagnostic-roster.jpg. Responsive action-screen and physical-device verification remain pending. Saved historical reports are retained; use a new match for the new knowledge rules.

## Second Crew group review

106 tests and syntax checks pass. Resonance now once/game: waiting preserves charge, later use resolves, spent use rejects. Existing jammer-refund and report tests remain passing. Research Assistant and Beacon information use existing My orders capability/report surfaces. Renamed Warden; added public toast on observed dead-to-alive player transitions, with persistent Ship log/private restoration reports retained. Browser/physical-device verification of the new prompt and revival toast remains pending.

## Third Crew group review

110 tests and syntax checks pass. Added Captain-only lobby seat swaps, playing-only adjacency, JSON restoration/order lock coverage, zero/singular/plural Surveyor counts, public source-free restriction announcements/expiry, and Auditor reveal-setting/legacy-launch rejection. Browser checked Auditor disabled with public reveals and enabled without; restored original unsaved setting. Phone 390×844 seating dialog visually checked; capture output/ui-qa/captain-seating-phone.jpg. This one-seat lobby correctly disables both move directions; actual swaps verified by engine tests. Physical-table seating and full multi-device restriction flow remain unverified.

## Fourth character group review

112 tests and syntax checks pass. Collective attack now accepts all playing seats, including self, other Hollow and dead players. Coverage verifies dead-target no-op/public no-death announcement, Hollow/self deaths, private streamed choices, observer exclusion, shared deadline, consensus and silent jamming without disturbing historical reports. Renamed Cryo Guardian and Cartographer; Cartographer remains night-only. Browser visual validation of the expanded target list remains pending.

## Fifth character group review

116 tests and syntax checks pass. Void Reaver extra attack opens night two with five alive; supported for 6–15-player pools. Collective/extra targets deduplicate before ordinary Warden/Sentinel protection and simultaneous deaths. Tests cover thresholds, shared/distinct targets, two public deaths, role-reveal setting, delay repeat prohibition, restart persistence and rematch reset. Signal Saboteur is nightly, with no target reused during the voyage.

Browser QA used a disposable engine-backed fixture on port 3048 and the actual client: night transitioned into discussion and a public two-token flip reveal for Atlas/Nova. Desktop and 390×844 final states inspected; phone had no horizontal overflow, two tokens and zero role labels with reveals off. No browser console errors. Captures: output/ui-qa/dawn-double-death-phone.jpg and dawn-double-death-desktop.jpg. Fixture/tab closed afterwards. This is fixture-backed visual verification, not physical multi-device timing or production QA.

## Echo and Thrall implementation

162 tests and syntax checks pass (46 added/updated coverage beyond previous 116-test baseline). Every existing Crew power has copy/resource activation coverage; targeted tests exercise copied scans/modes/passives/Medic, multiple wards/Medics, first-night expiry, exact-role privacy, dead copy recipient, jamming, delay, restoration/revival and rematch reset. Thrall coverage separates true allegiance, scan registration, network/consensus, parity/scoring, exact inspections and deal constraints; hostile target menus do not disclose it through exclusions.

Browser tests used isolated engine-backed fixtures on ports 3048/3049 with the actual client: Echo selected an unrevealed dead seat, received pending copy, advanced through tribunal and activated a Xenobiologist scan next night; new-information dot appeared. Thrall selected a living target and received its actual-evil report, with no network/hunt UI. Both checked at 390px without horizontal overflow or console errors. Captures: output/ui-qa/echo-copied-orders-phone.jpg, thrall-orders-phone.jpg. Disposable tabs/servers closed. Main 3047 preview restarted; both pool buttons enabled, original roster unchanged. Physical-device PWA, real group balance and deployed multiplayer remain unverified.

## Bot God / Script / variable spare cards

168 tests and syntax checks pass. Includes all-size 6–15 and spare-count 3/4/5 suggestion/deal matrix, legal factions and card conservation, schedule coverage/dependencies for all 30, candidate-only Script, private Oracle unused-card count, automatic first-night acknowledgement/reconnect and existing six-client restart/privacy transport test.

Browser: original lobby tested unsaved six-player +five-spare suggested pool and valid Save state, then reloaded to restore original settings. Script Character sheet and first/later Night order tabs inspected at 390px and 320px without overflow. Phone capture output/ui-qa/script-night-order-phone.jpg. Isolated engine-backed fixture tested Night watch local tap count (02), common countdown, no private-card/action-target DOM, no horizontal overflow or console errors at 390px; capture night-watch-phone.jpg. Fixture/tab closed, original roster unchanged. Physical shoulder-surfing/body-language privacy and group balance remain unverified; server-only input cannot physically hide an exposed screen.

## Dedicated Script editor / randomized pools

171 tests and syntax checks pass. Randomized-pool coverage spans all 6–15-player sizes, 3/4/5 spares and both death-reveal settings; checks size, faction minima, dependencies, copy limits and varied seeds. Actual secret server dealing is unchanged.

Browser verified compact Boarding summary; dedicated editor add/remove (Engineer first pair), faction switching with retained counts, varied visible random selections, clear invalidating Apply, and 15+5 randomized draft applying as 20 cards. Discard preserves prior briefing; applying marks unsaved and requires Save before launch. Reload restored original saved room throughout; no briefing was saved during QA. Full-screen layout checked at 390×844 and 320×568 without horizontal overflow; desktop checked at 1280×900 with three-column cards. No browser console errors. Captures: output/ui-qa/script-editor-phone.jpg and script-editor-desktop.jpg. Physical touch/PWA and group balance remain unverified. Crew-only Unknown Signal mode intentionally deferred per user.

## Compact Script cards and inline rules
174 tests and syntax checks pass. In-app browser verified Engineer 0→2→3→2 (minus disabled)→0, pressed-state toggles, randomizer, and inline Xenobiologist rules. Two-column phone and four-column desktop inspected; 320×568 and 1280×900 show no dialog overflow. Screenshots: output/ui-qa/card-toggle-phone.jpg and card-toggle-desktop.jpg. Drafts discarded; saved room unchanged. All 30 public references include timing and clashes. Installed PWA/physical touch and group balance remain unverified. Secret Hollow mode is proposed only.

Card cap: 175 tests and syntax checks pass. Browser verified full 9/9 disables unselected cards/+ while selected cards remain removable. Removing one unlocks single cards but keeps Engineer disabled until two slots are free. Selecting a replacement returns to 9/9. Draft discarded. Regression test also covers over-cap drafts after lowering the player count. Updated old randomizer error assertion to thematic Backup cadets wording.

Ship Intelligence visuals: 175 tests and syntax checks pass. Browser preview verified inline Hollow voter portraits on targets, changing/clearing choices, unanimous sealed target card, crimson Hollow night-order entries, 390px visuals and no dialog overflow at 320px. Separate choice summary removed per user direction. Public rules/starting text use Ship Intelligence. Live network synchronization continues using existing server-private snapshots; no live multi-client test this change.

Night pacing: 175 tests and syntax checks pass. Browser preview confirmed no Clear victim choice button, private orders open at 00:45 and automatically closed at 00:00 without interaction. Paused nights are excluded from local closure; authoritative night exit also closes orders/watch. Client closure does not resolve gameplay. Screenshot: output/ui-qa/night-terminal-auto-close.jpg.

Consensus auto-close: browser preview verified split choices keep My orders open, unanimous choice closes immediately with 00:44 left, and reopening shows the sealed target. Live snapshots trigger the same closure on newly locked consensus for living network members only. Shared night deadline remains unchanged. 175 tests and syntax checks pass; live multi-client closure not exercised.

Cadet night preview: added preview-only Cadet night entry showing a non-Captain Cadet, no Hollow network and no fabricated investigative reports. Syntax passes; 390×844 browser inspected My orders with night timer, inactive station, empty information and character reference. Screenshot: output/ui-qa/cadet-night-phone.jpg. Live gameplay unchanged.

Dusk interaction gallery: preview-only character selector covers all 30 identities. Syntax and 175 tests pass. 390px browser checked Xenobiologist selecting one, Arbiter modes, Medic corpse-only choices, Resonance use/wait. Gallery filters dead/adjacent/self/non-network targets and uses night one for first-night roles; it remains illustrative, not a game simulation. Screenshots: dusk-xenobiologist.jpg, dusk-arbiter.jpg, dusk-medic.jpg. Live rules unchanged.

Reveal/information previews: added Starting briefing, Sample dawn report and public Dawn reveals controls. Browser verified fresh report notification, private Xenobiologist result, starting briefing and two public death tokens with Cadet/Hollow labels. Illustrative sample reports do not execute live abilities. Syntax and 175 tests pass. Screenshots: dawn-new-information.jpg and dawn-reveals-phone.jpg.

Dawn gallery correction: role changes now preserve dawn view instead of resetting to night; New information opens My orders directly. Explicit DAWN headings, no night action panel in dawn preview. Corrected interactive controls wrapped in a div rather than a label. Syntax passes; browser verified Xenobiologist→Cartographer retains dawn and shows sample count without night timer/targets. Screenshot dawn-information-corrected.jpg.

Linked Engineer nightly update: action is no longer once-per-voyage; descriptions/wiki/night order updated. Regression verifies private zero/one/two matches on night one and a second successful diagnostic next night without a spent charge. All 175 tests and syntax pass. Browser verified nightly wording, two-target selection and no once-per-voyage label.

Cycle terminology: 177 tests and syntax checks pass. All authored cards/wiki/order prose now uses dark/light cycles; report/log display normalizes legacy saved wording. Server messages updated without changing phase keys, timer fields or rules. Browser checked dark action, light report and cycle-order views: no night/day/dawn/dusk words in visible body; first/later dark cycle tabs present. Existing first-dark-cycle no-attack rule retained. Development server restarted on 3047.

Captain preview: phase selector now includes starting orders, nominations and aftermath alongside discussion/voting/dark/victory. Browser inspected discussion, nomination, ballot (Reveal vote total disabled until all ballots), aftermath and dark-cycle controls. Playing Captain’s nomination view left open. Syntax passes; production controls unchanged. Screenshot captain-nominations-desktop.jpg.

Passive Research Assistant: 183 tests and syntax pass. Tests cover first-cycle/no casualties, repeated analysis, no Xenobiologist dependency/target action, current attack deaths versus executions/older corpses, multi-death aggregate privacy, Thrall registration, jam/death withholding, delayed timestamped delivery, Parasite interception, revived-recipient exclusion and copied Echo passive. Hidden death-reveal mode required in editor/dealer validation; randomizer excludes Assistant when reveals on. Browser checked passive no-target station and light-cycle aggregate report. Screenshot research-assistant-passive.jpg. Server restarted on 3047; physical/group balance unverified.

## Production release d98331b
189 local tests, syntax and production dependency audit pass. Includes actual six-client full match, private scan, ballot/execution, score-once/rematch, fifteen players plus overseer, fail-closed production startup, full PWA import/cache graph and failed-save rollback without path leakage. Fixed stale server Assistant dependency, version-mismatched PWA imports and unrelated-room PostgreSQL timestamp refresh.

GitHub https://github.com/Strategamma/Space-Case HEAD confirmed d98331b77d2a0f3c5d577bda98c8f2031c856d18. Release checks https://github.com/Strategamma/Space-Case/actions/runs/38825891203 succeeded, including real PostgreSQL snapshot/isolation/production restart and npm audit.

Isolated browser server on 3048: mobile hosting/avatar/setup/save/reveal, six live peers, dark/light transitions, two secret ballots/executions, victory and rematch completed. 320/390/1280 widths checked; console clear. With server stopped, cached shell still loaded with reconnection/Internet-required messaging. This does not verify installed physical PWA behavior. Screenshots: release-landing-phone.jpg, release-editor-phone.jpg.

Public Render URL https://space-case-ygl3.onrender.com responds to HTTPS and secure Socket.IO, browser console clear. It still serves app.js?v=38 and POST /health returns 200, proving the old build is active rather than the new release. Asked user to deploy latest d98331b; new hosted full-flow validation remains pending. A synthetic recovery room is held in a temporary QA process; no passes committed.

Database-free production (user choice): removed mandatory DATABASE_URL startup guard and database provisioning from render.yaml. PostgreSQL remains optional. Targeted production test boots with no DATABASE_URL, creates a room, restarts against the same file and resumes the saved pass. This verifies file recovery when storage survives, not durability on Render’s ephemeral filesystem. All 189 tests and syntax checks pass. Version 1.0.1.
