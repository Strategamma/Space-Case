# Space Case contributor instructions
Read docs/PROJECT.md first and keep it under 500 words. Read handoff/AGENTS.md and its referenced game/name guides before changing the game. Keep plan.md concise for non-trivial work; preserve unrelated behavior.

Node 24 native DOM/CSS PWA + authoritative Socket.IO. Run npm run check and npm test for engine/release changes; use targeted tests for small fixes. Private assignments, network choices and reports must remain server-filtered. Public phases use dark/light cycles; internal legacy keys remain stable.

Keep one server instance. PostgreSQL is optional; user chose file storage for now. Never commit environment secrets, boarding passes, room snapshots, node_modules or generated QA output. Validate PWA imports against the service-worker shell. CI additionally runs npm run test:postgres with a dedicated test database.

Report verification evidence and unresolved live/device limits honestly. Do not call the game shipped until the intended commit is deployed and hosted multiplayer/PWA checks pass. See docs/RELEASE.md.
