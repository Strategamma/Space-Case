# Space Case

Self-contained game repository. Create your GitHub repository from this `game` folder, so `package.json` and `render.yaml` are at the repository root. Do not select its parent Space Case folder.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm start
```

Open http://localhost:3000. Run `npm test` and `npm run check` to verify the game.

## Host on Render

Connect this repository using a Render Blueprint (`render.yaml`). It defines one Node web service and a PostgreSQL database; review Render's plan costs before creating them.

For a manually created web service:

- Root Directory: leave blank when this folder is the repository root.
- Build Command: `npm ci --omit=dev`
- Start Command: `npm start`
- Health Check Path: `/health`
- Environment: `NODE_ENV=production`, `NODE_VERSION=24`, and `DATABASE_URL` set to the Render PostgreSQL internal connection URL.
- Keep one service instance; active rooms are held in memory and saved to the database.

If you instead commit the parent directory as the repository, set Render's Root Directory to `game` for a manual service. The parent is not the recommended repository root.

Server entry point: `server/index.js`. Website entry point: `public/index.html`. Render serves the website and Socket.IO connection together at its HTTPS URL; no separate WebSocket URL is required. This package cannot be hosted as a working multiplayer game on GitHub Pages alone.

Without `DATABASE_URL`, room snapshots use `.data/rooms.json`. Render's default filesystem is temporary, so use PostgreSQL for persistence across restarts/deployments. Room recovery still requires players to reconnect.

Dependencies, local room snapshots, environment secrets, and generated output are excluded by `.gitignore`. Tests are included for validation; development dependencies are omitted by the Render build.

This package has not yet been deployed or verified on Render.
