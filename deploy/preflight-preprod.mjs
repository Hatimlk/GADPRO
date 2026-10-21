import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const required = ['CENTRAL_DATABASE_URL', 'CHEQUES_DATABASE_URL', 'IMPAYES_DATABASE_URL', 'LOGISTICS_DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Précontrôle refusé : variables manquantes dans shared/.env : ${missing.join(', ')}`);
  process.exit(1);
}

const migrationsDirectory = resolve(process.cwd(), 'database/migrations/logistique');
const migrations = (await readdir(migrationsDirectory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
const latest = migrations.at(-1);
if (!latest) {
  console.error('Précontrôle refusé : aucune migration Logistique trouvée dans la release.');
  process.exit(1);
}
const latestVersion = latest.split('_', 1)[0];

async function checkDatabase(label, connectionString, checkMigration = false) {
  const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
  try {
    await pool.query('SELECT 1');
    if (checkMigration) {
      const table = await pool.query("SELECT to_regclass('public.schema_migrations') AS name");
      if (!table.rows[0]?.name) throw new Error('schéma absent ; exécuter npm run migrate:logistics');
      const migration = await pool.query('SELECT name FROM schema_migrations WHERE version=$1', [latestVersion]);
      if (!migration.rowCount) throw new Error(`migration ${latest} absente ; exécuter npm run migrate:logistics`);
    }
    console.log(`Précontrôle ${label} : OK`);
  } catch (error) {
    console.error(`Précontrôle ${label} : ÉCHEC — ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await checkDatabase('identité', process.env.CENTRAL_DATABASE_URL);
await checkDatabase('logistique', process.env.LOGISTICS_DATABASE_URL, true);
if (process.exitCode) process.exit(process.exitCode);
