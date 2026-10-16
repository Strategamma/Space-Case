# Production release
Goal: deliver a deployable, verified Space Case release and publish when deployment access is available.
Scope: gameplay/transport regressions, privacy/recovery, production persistence, PWA/static delivery, CI and Render/GitHub packaging. Secret Hollow mode remains deferred.
Approach: inspect → fix concrete blockers → expand end-to-end release coverage → responsive live-browser checks → prepare isolated repository/release instructions → deploy and verify public service when configured.
Risks: current folder inherits unrelated parent Git; no GitHub/Render connection; PostgreSQL and physical PWA unverified. Never publish secrets, saved rooms or QA output.
Verification: syntax/full tests, six-to-fifteen-player transport scenarios, complete matches/reconnect/restart, production startup/static/PWA checks, mobile/desktop browser evidence. Live deployment evidence separate from local checks.

State: d98331b committed and pushed by user; 189 tests/syntax/audit and GitHub PostgreSQL CI pass. Render responds with previous v38 build; latest deployment requested. Public WSS reachable; live new-release full match/device acceptance still pending.

User decision: no database now. Version 1.0.1 removes mandatory DATABASE_URL, defaults to file snapshots, and removes automatic DB provisioning. Ephemeral Render storage may lose active rooms/session points on restart/deploy. Verify production file startup/recovery when the file survives, then publish/redeploy.
