import crypto from 'node:crypto';
import pg from 'pg';
import { analyzeUserMigration, assertMigrationCanApply, normalizeEmail } from './migrate-users-core.js';

const apply = process.argv.includes('--apply');
if (apply && !process.argv.includes('--confirm-user-migration')) {
  throw new Error('Le mode écriture exige --apply --confirm-user-migration.');
}

const required = ['CENTRAL_DATABASE_URL', 'CHEQUES_DATABASE_URL', 'IMPAYES_DATABASE_URL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Variables manquantes: ${missing.join(', ')}`);

const central = new pg.Pool({ connectionString: process.env.CENTRAL_DATABASE_URL });
const cheques = new pg.Pool({ connectionString: process.env.CHEQUES_DATABASE_URL });
const impayes = new pg.Pool({ connectionString: process.env.IMPAYES_DATABASE_URL });

async function loadCentralState(queryable) {
  const [users, identities] = await Promise.all([
    queryable.query('SELECT id,email,email_normalized,password_hash,active FROM users ORDER BY id'),
    queryable.query('SELECT central_user_id,source,legacy_user_id FROM legacy_identities ORDER BY source,legacy_user_id'),
  ]);
  return { users: users.rows, identities: identities.rows };
}

function createReport(analysis, inventory, fingerprint) {
  return {
    mode: apply ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    inventory,
    compatibleCandidates: analysis.candidates.length,
    conflicts: analysis.conflicts,
    fingerprint,
  };
}

try {
  const [cq, iq, centralState] = await Promise.all([
    cheques.query('SELECT id,name,email,password_hash,role,status FROM users ORDER BY id'),
    impayes.query('SELECT id,nom,email,mot_de_passe_hash,role,actif FROM users ORDER BY id'),
    loadCentralState(central),
  ]);
  const accounts = [
    ...cq.rows.map((user) => ({ source: 'cheques', legacyId: String(user.id), name: user.name, email: user.email, hash: user.password_hash, role: user.role, active: user.status === 'Actif' })),
    ...iq.rows.map((user) => ({ source: 'impayes', legacyId: String(user.id), name: user.nom, email: user.email, hash: user.mot_de_passe_hash, role: user.role, active: user.actif })),
  ];
  const fingerprint = crypto.createHash('sha256').update(accounts.map((account) => (
    `${account.source}:${account.legacyId}:${normalizeEmail(account.email)}:${account.hash}:${account.active}`
  )).sort().join('|')).digest('hex');
  const inventory = {
    cheques: cq.rowCount,
    impayes: iq.rowCount,
    centralUsers: centralState.users.length,
    centralIdentities: centralState.identities.length,
    uniqueEmails: new Set(accounts.map((account) => normalizeEmail(account.email))).size,
  };
  const analysis = analyzeUserMigration(accounts, centralState.users, centralState.identities);
  const report = createReport(analysis, inventory, fingerprint);

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = analysis.conflicts.length ? 2 : 0;
  } else {
    // Aucun INSERT ne doit commencer tant que le précontrôle complet n'est pas sain.
    assertMigrationCanApply(analysis);
    const client = await central.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      await client.query('LOCK TABLE users, legacy_identities, module_access, migration_runs IN SHARE ROW EXCLUSIVE MODE');
      const lockedState = await loadCentralState(client);
      const lockedAnalysis = analyzeUserMigration(accounts, lockedState.users, lockedState.identities);
      assertMigrationCanApply(lockedAnalysis);

      const run = await client.query(
        `INSERT INTO migration_runs(source_fingerprint,status,report)
         VALUES($1,'running',$2)
         ON CONFLICT(source_fingerprint) DO NOTHING RETURNING id`,
        [fingerprint, report],
      );
      if (!run.rowCount) throw new Error('Cet inventaire a déjà été migré; aucune écriture effectuée.');

      const existingIdentities = new Set(lockedState.identities.map((identity) => `${identity.source}:${identity.legacy_user_id}`));
      for (const candidate of lockedAnalysis.candidates) {
        const first = candidate.accounts[0];
        let userId = candidate.centralUserId;
        if (!userId) {
          const inserted = await client.query(
            `INSERT INTO users(name,email,email_normalized,password_hash,active)
             VALUES($1,$2,$3,$4,$5) RETURNING id`,
            [first.name, first.email.trim(), candidate.email, first.hash, first.active],
          );
          userId = inserted.rows[0].id;
        }

        for (const account of candidate.accounts) {
          const identity = `${account.source}:${account.legacyId}`;
          if (!existingIdentities.has(identity)) {
            await client.query(
              `INSERT INTO legacy_identities(central_user_id,source,legacy_user_id,metadata,migration_run_id)
               VALUES($1,$2,$3,$4,$5)`,
              [userId, account.source, account.legacyId, JSON.stringify({ importedRole: account.role }), run.rows[0].id],
            );
          }
          const permissions = ['read', ...(account.role === 'Administrateur' || account.role === 'admin'
            ? ['write', 'admin', '*']
            : account.role === 'lecture_seule' ? [] : ['write'])];
          await client.query(
            `INSERT INTO module_access(user_id,module_code,role,permissions)
             VALUES($1,$2,$3,$4) ON CONFLICT(user_id,module_code) DO NOTHING`,
            [userId, account.source, account.role, JSON.stringify(permissions)],
          );
        }
      }
      await client.query(`UPDATE migration_runs SET status='complete',report=$2 WHERE id=$1`, [run.rows[0].id, report]);
      await client.query('COMMIT');
      console.log(JSON.stringify({ ...report, migrated: lockedAnalysis.candidates.length, migrationRunId: run.rows[0].id }, null, 2));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await Promise.all([central.end(), cheques.end(), impayes.end()]);
}
