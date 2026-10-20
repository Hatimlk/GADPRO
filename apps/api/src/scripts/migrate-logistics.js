import crypto from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logisticsPool } from '../db.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = resolve(here, '../../../../database/migrations/logistique');
const client = await logisticsPool.connect();

try {
  await client.query("SELECT pg_advisory_lock(hashtext('progad_logistics_migrations'))");
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const files = (await readdir(migrationsDirectory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  for (const name of files) {
    const version = name.split('_', 1)[0];
    const sql = await readFile(resolve(migrationsDirectory, name), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const existing = await client.query('SELECT checksum FROM schema_migrations WHERE version=$1', [version]);
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) throw new Error(`La migration ${name} a été modifiée après application.`);
      continue;
    }

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations(version,name,checksum) VALUES($1,$2,$3)',
        [version, name, checksum],
      );
      await client.query('COMMIT');
      console.log(`Migration Logistique appliquée : ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  console.log('Schéma Logistique à jour.');
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('progad_logistics_migrations'))").catch(() => undefined);
  client.release();
  await logisticsPool.end();
}
