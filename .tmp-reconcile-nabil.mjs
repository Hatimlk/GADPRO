import fs from 'fs';
import path from 'path';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const CENTRAL_KEEP = 'a101d77c-f9e4-4a44-9667-4d1bda11e59d';
const CENTRAL_REMOVE = '9724f109-2c22-4803-b4c1-35925739edde';
const LEGACY_KEEP = '03461dcc-451d-4047-865b-b8fd64d4cd08';
const LEGACY_REMOVE = '50b24b44-151d-4198-ab6f-49cf91324cc4';
const EMAIL_KEEP = 'nabil.safouane@gadimat.com';
const EMAIL_REMOVE = 'nabil@gadimat.com';

const centralPool = new pg.Pool({ connectionString: process.env.CENTRAL_DATABASE_URL, max: 1 });
const impayesPool = new pg.Pool({ connectionString: process.env.IMPAYES_DATABASE_URL, max: 1 });
const central = await centralPool.connect();
const impayes = await impayesPool.connect();

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  await central.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  await impayes.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

  const [centralUsers, centralAccesses, centralIdentities, legacyUsers, notifications] = await Promise.all([
    central.query('SELECT * FROM users WHERE id=ANY($1::uuid[]) ORDER BY email FOR UPDATE', [[CENTRAL_KEEP, CENTRAL_REMOVE]]),
    central.query('SELECT * FROM module_access WHERE user_id=ANY($1::uuid[]) ORDER BY user_id,module_code FOR UPDATE', [[CENTRAL_KEEP, CENTRAL_REMOVE]]),
    central.query('SELECT * FROM legacy_identities WHERE central_user_id=ANY($1::uuid[]) ORDER BY central_user_id,source FOR UPDATE', [[CENTRAL_KEEP, CENTRAL_REMOVE]]),
    impayes.query('SELECT * FROM users WHERE id=ANY($1::uuid[]) ORDER BY email FOR UPDATE', [[LEGACY_KEEP, LEGACY_REMOVE]]),
    impayes.query('SELECT * FROM notifications WHERE user_id=ANY($1::uuid[]) ORDER BY date_creation FOR UPDATE', [[LEGACY_KEEP, LEGACY_REMOVE]]),
  ]);

  const centralKeep = centralUsers.rows.find((user) => user.id === CENTRAL_KEEP);
  const centralRemove = centralUsers.rows.find((user) => user.id === CENTRAL_REMOVE);
  const legacyKeep = legacyUsers.rows.find((user) => user.id === LEGACY_KEEP);
  const legacyRemove = legacyUsers.rows.find((user) => user.id === LEGACY_REMOVE);
  const retainedIdentity = centralIdentities.rows.find((identity) => identity.central_user_id === CENTRAL_KEEP && identity.source === 'impayes');
  const removedIdentity = centralIdentities.rows.find((identity) => identity.central_user_id === CENTRAL_REMOVE && identity.source === 'impayes');

  assert(centralKeep?.email.toLowerCase() === EMAIL_KEEP, 'Compte central Nabil à conserver inattendu.');
  assert(centralRemove?.email.toLowerCase() === EMAIL_REMOVE, 'Compte central Nabil à supprimer inattendu.');
  assert(legacyKeep?.email.toLowerCase() === EMAIL_KEEP && legacyKeep.role === 'responsable_recouvrement', 'Identité Impayés à conserver inattendue.');
  assert(legacyRemove?.email.toLowerCase() === EMAIL_REMOVE && legacyRemove.role === 'commercial', 'Identité Impayés à supprimer inattendue.');
  assert(retainedIdentity?.legacy_user_id === LEGACY_KEEP, 'Correspondance centrale conservée inattendue.');
  assert(removedIdentity?.legacy_user_id === LEGACY_REMOVE, 'Correspondance centrale du doublon inattendue.');

  const referenceTables = [
    ['actions', 'auteur_id'],
    ['audit_logs', 'utilisateur_id'],
    ['dossiers', 'commercial_id'],
    ['erp_actions', 'auteur_id'],
    ['erp_dossier_suivi', 'commercial_id'],
    ['refresh_tokens', 'user_id'],
  ];
  const references = {};
  for (const [table, column] of referenceTables) {
    const result = await impayes.query(`SELECT * FROM ${table} WHERE ${column}=ANY($1::uuid[]) FOR UPDATE`, [[LEGACY_KEEP, LEGACY_REMOVE]]);
    references[table] = result.rows;
  }

  const snapshot = {
    createdAt: new Date().toISOString(),
    central: { users: centralUsers.rows, accesses: centralAccesses.rows, identities: centralIdentities.rows },
    impayes: { users: legacyUsers.rows, notifications: notifications.rows, references },
  };

  if (!APPLY) {
    await Promise.all([central.query('ROLLBACK'), impayes.query('ROLLBACK')]);
    console.log(JSON.stringify({
      mode: 'dry-run',
      validated: true,
      retained: EMAIL_KEEP,
      removed: EMAIL_REMOVE,
      notificationsToMove: notifications.rows.filter((item) => item.user_id === LEGACY_REMOVE).length,
    }, null, 2));
  } else {
    const backupDirectory = '/var/www/gadpro-preprod/backups';
    fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
    const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
    const backupPath = path.join(backupDirectory, `nabil-merge-before-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });

    await central.query(
      `UPDATE module_access SET role='responsable_recouvrement',permissions='["read","write"]'::jsonb,active=true
       WHERE user_id=$1 AND module_code='impayes'`,
      [CENTRAL_KEEP],
    );
    await central.query(
      `INSERT INTO audit_logs(user_id,event,details)
       VALUES($1,'ADMIN_IDENTITY_RECONCILIATION',$2::jsonb)`,
      [CENTRAL_KEEP, JSON.stringify({ retainedEmail: EMAIL_KEEP, removedDuplicateEmail: EMAIL_REMOVE, module: 'impayes' })],
    );
    await central.query('DELETE FROM users WHERE id=$1', [CENTRAL_REMOVE]);

    for (const [table, column] of referenceTables.filter(([table]) => table !== 'refresh_tokens')) {
      await impayes.query(`UPDATE ${table} SET ${column}=$1 WHERE ${column}=$2`, [LEGACY_KEEP, LEGACY_REMOVE]);
    }
    await impayes.query('UPDATE notifications SET user_id=$1 WHERE user_id=$2', [LEGACY_KEEP, LEGACY_REMOVE]);
    await impayes.query('DELETE FROM refresh_tokens WHERE user_id=$1', [LEGACY_REMOVE]);
    await impayes.query(
      `UPDATE users SET nom='Nabil SAFOUANE',email=$2,role='responsable_recouvrement',actif=true,date_modification=NOW()
       WHERE id=$1`,
      [LEGACY_KEEP, EMAIL_KEEP],
    );
    await impayes.query('DELETE FROM users WHERE id=$1', [LEGACY_REMOVE]);

    await central.query('COMMIT');
    await impayes.query('COMMIT');

    const [centralVerification, legacyVerification, notificationVerification] = await Promise.all([
      central.query(
        `SELECT u.id,u.name,u.email,u.active,li.legacy_user_id,ma.role
         FROM users u JOIN legacy_identities li ON li.central_user_id=u.id AND li.source='impayes'
         JOIN module_access ma ON ma.user_id=u.id AND ma.module_code='impayes'
         WHERE u.email ILIKE '%nabil%' ORDER BY u.email`,
      ),
      impayes.query(`SELECT id,nom,email,role,actif FROM users WHERE email ILIKE '%nabil%' ORDER BY email`),
      impayes.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1', [LEGACY_KEEP]),
    ]);
    console.log(JSON.stringify({
      mode: 'apply', backupPath,
      centralAccounts: centralVerification.rows,
      legacyUsers: legacyVerification.rows,
      retainedNotifications: notificationVerification.rows[0].count,
    }, null, 2));
  }
} catch (error) {
  await Promise.all([central.query('ROLLBACK').catch(() => undefined), impayes.query('ROLLBACK').catch(() => undefined)]);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  central.release();
  impayes.release();
  await Promise.all([centralPool.end(), impayesPool.end()]);
}
