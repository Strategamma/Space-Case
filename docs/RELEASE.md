# Space Case 1.0.0 release

## Repository and hosting

GitHub: https://github.com/Strategamma/Space-Case
Publishing checkout: `game/Space Case` inside the development workspace. Its repository root must directly contain package.json/render.yaml. Root directory on Render: blank.

Render Blueprint: one Node 24 service, private PostgreSQL, same-origin HTTPS/Socket.IO. Production requires DATABASE_URL and checks it at /health. Blueprint uses current 0.1c-256mb database plan naming, with no public database IP access. Hosting URL/service not yet confirmed.

## Release checks

- `npm ci`, `npm run check`, `npm test`, production dependency audit.
- CI runs a real PostgreSQL save/update/restart check using a disposable service.
- Six actual Socket.IO peers play through initial reveal, dark-cycle scan, discussion extension, secret ballot, execution, victory, score-once and rematch. Fifteen players plus overseeing Captain test capacity and recipient secrecy.
- PWA release test follows the served HTML/import graph and verifies every module is precached. Cached shell does not provide offline multiplayer.
- Device and live acceptance below remain separate from automated checks. Record exact URL/commit when passed; do not equate local tests with hosted verification.

## Rollout

1. Merge/push the reviewed release; require green Release checks including PostgreSQL.
2. Connect the repository in Render as a Blueprint. Review its displayed service/database prices before creating paid resources. Leave Root Directory blank; use internal DATABASE_URL.
3. Confirm deployment uses the intended commit and /health returns 200. Open the public HTTPS URL; confirm Socket.IO uses that same origin.
4. On two separate physical devices, create/join, launch/reveal, submit abilities, complete a ballot/execution and rematch. Test host disconnect/succession, player reconnect and server redeploy recovery against PostgreSQL.
5. Install the PWA on a phone; test standalone launch, cached offline warning, reconnect, and update after all old tabs close. Check 320px, 390px, tablet and desktop, touch keyboard and safe areas. Verify both victory teams and private reports.
6. Only after these pass, add the verified public URL to decadenceinc.com. Preserve the existing site; do not label the game live before hosted acceptance.

## Rollback and recovery

Keep one instance. During a deploy, clients reconnect with their saved passes; recovered rooms pause until reconnected. Never delete or replace PostgreSQL to roll back an application deployment. Use Render’s previous successful commit if needed, retaining environment and database. Review changes to persisted room fields before rolling back across future incompatible versions. Current release retains legacy phase keys.

If database health fails, Render health must be 503; inspect deployment/database logs without exposing DATABASE_URL or player passes. Persistence is saved before command success/broadcast. Client errors should prompt reconnect, not a fresh room that discards an active match.

## Remaining external gates

Render service URL/access, hosted PostgreSQL CI/run results, physical-device PWA validation and real group balance playtesting must be confirmed. Dealer strength budgets are provisional heuristics, not proven equal win rates. Secret bot-added Hollow mode remains deferred.

Sources checked for deployment configuration: https://render.com/docs/blueprint-spec and https://render.com/docs/node-version
