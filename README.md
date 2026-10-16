# Space Case

A mobile-first, in-person social deduction PWA for **6–15 players**, built for Decadence Arcade. Play on separate phones, tablets or computers with an Internet connection. The full-stack Node service serves the game and its private Socket.IO connections from one origin.

## Development

Requires Node **24.x**.

```sh
npm ci
PORT=3047 npm start
```

Open http://localhost:3047. The default port without `PORT` is 3000. Create a voyage, choose an unclaimed avatar and share its boarding code. `/?preview` is a labelled visual gallery, not a live match.

```sh
npm run check
npm test
npm audit --omit=dev --audit-level=high
```

Tests cover role interactions, secret recipient projections, legal randomized dealing, real six-client full matches, fifteen-player/overseer onboarding, reconnect/restart, rematch, and the complete versioned PWA dependency graph. Browser/device and hosted acceptance results are recorded separately in `docs/RELEASE.md`.

## Rules

- Captain can play with only their own private information, or oversee without a character, ballot or point.
- Select player count plus **3, 4 or 5 Backup cadets**: possible cards left unused in secret. All candidates are public; dealt roles and actual team counts remain private. The dealer validates faction and provisional strength limits, then randomly assigns a legal deal.
- All **30 characters** are implemented. My orders contains private starting information, phase-gated actions and timestamped reports. Script shows candidates, expandable rules and dark-cycle order.
- Dark cycles resolve simultaneously. Dark cycle one has no kills; later, all living Hollow network members must agree on a victim. Thrall is excluded from that network. No consensus means no collective attack. Consensus locks Hollow orders and conceals their terminals without ending the shared timer.
- Ship Intelligence resolves disruption, protection/control, observations, attacks, revival, casualty/neighbour analysis and private delivery. Dead recipients receive no new information. Research Assistant passively analyses current dark-cycle casualties, independently of the Xenobiologist, and requires public death-character reveals off.
- Light cycles allow discussion, nomination and secret Execute/Spare ballots. Self-nominations are permitted. Half of living eligible voters, rounded up, qualifies; the unique highest qualifying total faces execution. Tied highest totals cancel execution. At most one execution per light cycle.
- Crew win when no evil players remain alive. Hollow win at living parity, including Thrall. Every winning teammate scores one, dead teammates included. Scores persist through room rematches.
- Captain disconnects pause play; connected crew can unanimously consent to succession. Living disconnects during dark cycles/ballots pause until reconnection. Server restarts recover rooms paused for reconnect.

Details: `docs/PROJECT.md`, `docs/CARD_RULES.md`, `docs/INTERACTION_CONTRACT.md`. Crew-only selection with secret bot-added Hollow is **not part of this release**.

## Render deployment

Use the repository root containing `package.json` and `render.yaml`. Leave Render’s **Root Directory blank**. The Blueprint defines one Node service, with no database provisioned. Review the displayed hosting cost before provisioning.

- Build: `npm ci --omit=dev`
- Start: `npm start`
- Health: `/health` (also checks PostgreSQL connectivity when configured)
- Runtime: Node 24; exactly **one** server instance
- Environment: `NODE_ENV=production`; Render supplies `PORT`. No `DATABASE_URL` is required.
- Optional: `DATABASE_SSL=true` only for a database endpoint requiring trusted TLS. Prefer Render’s internal database URL.

Without `DATABASE_URL`, rooms use `.data/rooms.json` in development and production. On Render’s ephemeral filesystem, active games and session points may be lost during restarts or deployments. This no-database mode is the current user-selected release configuration. PostgreSQL can be added later by setting its internal connection URL as `DATABASE_URL`. Secrets and saved rooms must never be committed. Boarding passes are random per-seat credentials; callsigns and `arcadeName` are editable display-name hints, never identity.

`npm run test:postgres` requires `TEST_DATABASE_URL` pointing to a dedicated database whose name contains `test`. It verifies isolated room saves and production server restart recovery. GitHub Actions provisions an isolated PostgreSQL service for this check.

See `docs/RELEASE.md` for rollout, rollback and acceptance checks. A PWA caches the shell; hosted multiplayer still requires Internet. App updates wait for existing tabs to close. Do not scale to multiple instances without adding shared room coordination.

## Assets

Original space artwork and portraits are included as optimized WebP. Bundled Space Grotesk uses the SIL Open Font License in `public/assets/FONT-LICENSE.txt`. Reduced motion is supported; terminal audio is opt-in. User-facing phases are light/dark cycles; legacy save/protocol identifiers remain stable.
