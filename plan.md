Goal: address group-playtest blockers and first-player comprehension.
Scope: actual-seat setup/+3, visible Command, ordered private reports/help and authenticated seat recovery.
Approach: implemented server-derived counts and Cadet filler, fixed new pools with legacy-active preservation, real Command selection, phase-led orders, room-indexed passes and private transfer, idempotent/retry-safe recovery and persisted takeover.
Risks: secrets remain server-filtered; no recovery without a pass/backup or surviving room state. Physical Pixel/Samsung behavior remains unverified.
Verification: Node 24 syntax/catalogue/PWA checks; full 263-test suite plus explicit-update and targeted recovery tests; actual Chrome touch contexts at 320/390 verified Command → nominations → next dark cycle, code-entry restoration and deliberate takeover. Private report/unread, cross-browser pass transfer, late-join draft retention and non-host Settings access also passed. See change plan for limits.
State: local implementation, no commit/push/deployment. Physical Android, hosted multiplayer, installed-PWA and PostgreSQL integration checks remain open.
