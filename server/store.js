import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

export async function openStore() {
  if(process.env.NODE_ENV==='production'&&!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production. Configure persistent PostgreSQL before starting.');
  const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max:5, connectionTimeoutMillis:5000, query_timeout:5000, ...(process.env.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}) }) : null;
  const file = resolve(process.env.DATA_FILE || '.data/rooms.json');
  if (pool) await pool.query('CREATE TABLE IF NOT EXISTS space_case_rooms (code text PRIMARY KEY, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  else await mkdir(dirname(file), { recursive: true });
  let chain = Promise.resolve();
  return {
    async load() {
      if (pool) return (await pool.query("SELECT state FROM space_case_rooms WHERE updated_at > now() - interval '24 hours'")).rows.map(row => row.state);
      try { return JSON.parse(await readFile(file, 'utf8')).filter(room => Date.now() - room.updatedAt < 86_400_000); }
      catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    },
    save(rooms, changedCode) {
      const snapshots = JSON.parse(JSON.stringify([...rooms.values()]));
      chain = chain.catch(() => {}).then(async () => {
        if (pool) {
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            for (const room of snapshots.filter(room=>!changedCode||room.code===changedCode)) await client.query('INSERT INTO space_case_rooms (code, state) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET state = $2, updated_at = now()', [room.code, room]);
            await client.query("DELETE FROM space_case_rooms WHERE updated_at < now() - interval '24 hours'");
            await client.query('COMMIT');
          } catch (error) { await client.query('ROLLBACK'); throw error; }
          finally { client.release(); }
        } else { await writeFile(`${file}.tmp`, JSON.stringify(snapshots), { mode: 0o600 }); await rename(`${file}.tmp`, file); }
      });
      return chain;
    },
    async healthy() {
      if(pool) await pool.query('SELECT 1');
      return true;
    },
    async close() { await chain; if (pool) await pool.end(); }
  };
}
