# Space Case 1.0.1 release

## Repository and hosting

GitHub: https://github.com/Strategamma/Space-Case
Publishing checkout: `game/Space Case` inside the development workspace. Its repository root must directly contain package.json/render.yaml. Root directory on Render: blank.

Render Blueprint: one Node 24 service with local file storage, same-origin HTTPS/Socket.IO. User explicitly chose no database for now. DATABASE_URL is optional; /health checks PostgreSQL only when configured. Blueprint provisions no database. Service URL: https://space-case-ygl3.onrender.com. Release d98331b passed CI but failed Render startup because DATABASE_URL was missing. Version 1.0.1 restores database-free production startup; its rollout is pending.

## Release checks

- `npm ci`, `npm run check`, `npm test`, production dependency audit.
- CI runs a real PostgreSQL save/update/restart check using a disposable service.
- Six actual Socket.IO peers play through initial reveal, dark-cycle scan, discussion extension, secret ballot, execution, victory, score-once and rematch. Fifteen players plus overseeing Captain test capacity and recipient secrecy.
- PWA release test follows the served HTML/import graph and verifies every module is precached. Cached shell does not provide offline multiplayer.
- Device and live acceptance below remain separate from automated checks. Record exact URL/commit when passed; do not equate local tests with hosted verification.

## Rollout

1. Merge/push the reviewed release; require green Release checks including the optional PostgreSQL backend.
2. Connect the repository in Render as a Blueprint. Review its displayed service price before creating paid resources. Leave Root Directory blank; no database is needed.
3. Confirm deployment uses the intended commit and /health returns 200. Open the public HTTPS URL; confirm Socket.IO uses that same origin.
4. On two separate physical devices, create/join, launch/reveal, submit abilities, complete a ballot/execution and rematch. Test host disconnect/succession, player reconnect and a redeploy. Without durable storage, expect old rooms to be lost; with optional PostgreSQL, confirm boarding passes recover rooms.
5. Install the PWA on a phone; test standalone launch, cached offline warning, reconnect, and update after all old tabs close. Check 320px, 390px, tablet and desktop, touch keyboard and safe areas. Verify both victory teams and private reports.
6. Only after these pass, add the verified public URL to decadenceinc.com. Preserve the existing site; do not label the game live before hosted acceptance.

## Rollback and recovery

Keep one instance. File snapshots recover only when the same filesystem survives. Render deployments/restarts may discard them in this no-database configuration. With optional PostgreSQL, clients reconnect with saved passes and recovered rooms pause until reconnected. Never delete or replace an existing database to roll back an application deployment. Use Render’s previous successful commit if needed, retaining environment and database. Review changes to persisted room fields before rolling back across future incompatible versions. Current release retains legacy phase keys.

If configured database health fails, Render health must be 503; inspect deployment/database logs without exposing DATABASE_URL or player passes. Persistence is saved before command success/broadcast. Client errors should prompt reconnect, not a fresh room that discards an active match.

## Remaining external gates

Render rollout, physical-device PWA validation and real group balance playtesting remain to confirm. Local/CI PostgreSQL tests do not make this no-database deployment durable. Dealer strength budgets are provisional heuristics, not proven equal win rates. Secret bot-added Hollow mode remains deferred.

Sources checked for deployment configuration: https://render.com/docs/blueprint-spec and https://render.com/docs/node-version
