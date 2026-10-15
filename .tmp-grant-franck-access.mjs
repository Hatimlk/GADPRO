import fs from 'fs';
import path from 'path';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const TARGET_ID = 'caf850e9-6118-4ef6-bcfd-b7aeb1b33c14';
const LEGACY_OWNER_ID = '5020eeeb-4bd4-4e20-a4cc-98d07954fc4c';
const TARGET_EMAIL = 'franck.guillet@gadimat.com';
const LEGACY_OWNER_EMAIL = 'admin@gadimat.com';
const CHEQUES_LEGACY_ID = '4';
const IMPAYES_LEGACY_ID = '2767f9a7-831e-4b4e-ba0e-ef9599171377';

const pool = new pg.Pool({ connectionString: process.env.CENTRAL_DATABASE_URL, max: 1 });
const client = await pool.connect();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

  const users = await client.query(
    `SELECT id,name,email,active,platform_admin,session_version
     FROM users WHERE id=ANY($1::uuid[]) ORDER BY email FOR UPDATE`,
    [[TARGET_ID, LEGACY_OWNER_ID]],
  );
  const accesses = await client.query(
    `SELECT user_id,module_code,role,permissions,data_scope,active
     FROM module_access WHERE user_id=ANY($1::uuid[]) ORDER BY user_id,module_code FOR UPDATE`,
    [[TARGET_ID, LEGACY_OWNER_ID]],
  );
  const identities = await client.query(
    `SELECT central_user_id,source,legacy_user_id,metadata,migration_run_id
     FROM legacy_identities
     WHERE central_user_id=ANY($1::uuid[]) OR (source='cheques' AND legacy_user_id=$2)
     ORDER BY central_user_id,source FOR UPDATE`,
    [[TARGET_ID, LEGACY_OWNER_ID], CHEQUES_LEGACY_ID],
  );

  const target = users.rows.find((user) => user.id === TARGET_ID);
  const oldOwner = users.rows.find((user) => user.id === LEGACY_OWNER_ID);
  const chequeIdentity = identities.rows.find((item) => item.source === 'cheques' && item.legacy_user_id === CHEQUES_LEGACY_ID);
  const impayeIdentity = identities.rows.find((item) => item.source === 'impayes' && item.legacy_user_id === IMPAYES_LEGACY_ID);

  assert(target && target.email.toLowerCase() === TARGET_EMAIL, 'Le compte central Franck attendu est introuvable.');
  assert(oldOwner && oldOwner.email.toLowerCase() === LEGACY_OWNER_EMAIL, 'Le propriétaire historique attendu est introuvable.');
  assert(chequeIdentity?.central_user_id === LEGACY_OWNER_ID, 'La correspondance Chèques a changé depuis l’audit.');
  assert(impayeIdentity?.central_user_id === TARGET_ID, 'La correspondance Impayés de Franck a changé depuis l’audit.');
  assert(!identities.rows.some((item) => item.central_user_id === TARGET_ID && item.source === 'cheques'), 'Franck possède déjà une autre identité Chèques.');

  const snapshot = { createdAt: new Date().toISOString(), users: users.rows, accesses: accesses.rows, identities: identities.rows };
  if (!APPLY) {
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ mode: 'dry-run', validated: true, snapshot }, null, 2));
    process.exitCode = 0;
  } else {
    const backupDirectory = '/var/www/gadpro-preprod/backups';
    fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    const backupPath = path.join(backupDirectory, `central-franck-before-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });

    await client.query(
      `UPDATE users SET active=true,platform_admin=true,session_version=session_version+1,updated_at=NOW()
       WHERE id=$1`,
      [TARGET_ID],
    );
    await client.query(
      `INSERT INTO module_access(user_id,module_code,role,permissions,data_scope,active)
       VALUES
         ($1,'cheques','Administrateur',$2,'{}',true),
         ($1,'consommations','Administrateur',$2,'{}',true),
         ($1,'impayes','admin',$2,'{}',true)
       ON CONFLICT(user_id,module_code) DO UPDATE SET
         role=EXCLUDED.role,permissions=EXCLUDED.permissions,data_scope=EXCLUDED.data_scope,active=true`,
      [TARGET_ID, JSON.stringify(['read', 'write', 'admin', '*'])],
    );
    await client.query(
      `UPDATE legacy_identities SET central_user_id=$1
       WHERE central_user_id=$2 AND source='cheques' AND legacy_user_id=$3`,
      [TARGET_ID, LEGACY_OWNER_ID, CHEQUES_LEGACY_ID],
    );
    await client.query(
      `DELETE FROM module_access WHERE user_id=$1 AND module_code IN ('cheques','consommations')`,
      [LEGACY_OWNER_ID],
    );
    await client.query(
      `UPDATE users SET active=false,session_version=session_version+1,updated_at=NOW() WHERE id=$1`,
      [LEGACY_OWNER_ID],
    );
    await client.query(
      `INSERT INTO audit_logs(user_id,event,details)
       VALUES(NULL,'ADMIN_IDENTITY_RECONCILIATION',$1::jsonb)`,
      [JSON.stringify({ targetUserId: TARGET_ID, disabledDuplicateUserId: LEGACY_OWNER_ID, sources: ['cheques', 'impayes'], modules: ['cheques', 'impayes', 'consommations'] })],
    );
    await client.query('COMMIT');

    const verified = await client.query(
      `SELECT u.id,u.name,u.email,u.active,u.platform_admin,
        COALESCE((SELECT json_agg(json_build_object('module',ma.module_code,'role',ma.role,'permissions',ma.permissions,'active',ma.active) ORDER BY ma.module_code)
                  FROM module_access ma WHERE ma.user_id=u.id),'[]') AS accesses,
        COALESCE((SELECT json_agg(json_build_object('source',li.source,'legacyUserId',li.legacy_user_id) ORDER BY li.source)
                  FROM legacy_identities li WHERE li.central_user_id=u.id),'[]') AS identities
       FROM users u WHERE u.id=ANY($1::uuid[]) ORDER BY u.email`,
      [[TARGET_ID, LEGACY_OWNER_ID]],
    );
    console.log(JSON.stringify({ mode: 'apply', backupPath, users: verified.rows }, null, 2));
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
