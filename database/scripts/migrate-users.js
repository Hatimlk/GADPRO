import crypto from 'node:crypto';
import pg from 'pg';

const apply = process.argv.includes('--apply');
if (apply && !process.argv.includes('--confirm-user-migration')) throw new Error('Le mode écriture exige --apply --confirm-user-migration.');
const required = ['CENTRAL_DATABASE_URL', 'CHEQUES_DATABASE_URL', 'IMPAYES_DATABASE_URL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Variables manquantes: ${missing.join(', ')}`);
const central = new pg.Pool({ connectionString: process.env.CENTRAL_DATABASE_URL });
const cheques = new pg.Pool({ connectionString: process.env.CHEQUES_DATABASE_URL });
const impayes = new pg.Pool({ connectionString: process.env.IMPAYES_DATABASE_URL });
const normalize = (value) => String(value || '').trim().toLowerCase().normalize('NFKC');
const bcryptCompatible = (hash) => /^\$2[aby]\$\d\d\$/.test(hash || '');

try {
  const [cq, iq] = await Promise.all([
    cheques.query('SELECT id,name,email,password_hash,role,status FROM users ORDER BY id'),
    impayes.query('SELECT id,nom,email,mot_de_passe_hash,role,actif FROM users ORDER BY id'),
  ]);
  const accounts = [
    ...cq.rows.map((u) => ({ source: 'cheques', legacyId: String(u.id), name: u.name, email: u.email, hash: u.password_hash, role: u.role, active: u.status === 'Actif' })),
    ...iq.rows.map((u) => ({ source: 'impayes', legacyId: String(u.id), name: u.nom, email: u.email, hash: u.mot_de_passe_hash, role: u.role, active: u.actif })),
  ];
  const groups = new Map();
  for (const account of accounts) { const key = normalize(account.email); groups.set(key, [...(groups.get(key) || []), account]); }
  const conflicts = []; const candidates = [];
  for (const [email, values] of groups) {
    const badHash = values.some((value) => !bcryptCompatible(value.hash));
    const passwordConflict = new Set(values.map((value) => value.hash)).size > 1;
    const statusConflict = new Set(values.map((value) => value.active)).size > 1;
    if (!email || badHash || passwordConflict || statusConflict) conflicts.push({ email: email || '(vide)', sources: values.map((v) => v.source), legacyIds: values.map((v) => `${v.source}:${v.legacyId}`), reasons: [!email && 'email_invalide', badHash && 'hash_non_bcrypt', passwordConflict && 'mots_de_passe_differents', statusConflict && 'statuts_differents'].filter(Boolean) });
    else candidates.push({ email, accounts: values });
  }
  const fingerprint = crypto.createHash('sha256').update(accounts.map((a) => `${a.source}:${a.legacyId}:${normalize(a.email)}:${a.active}`).sort().join('|')).digest('hex');
  const report = { mode: apply ? 'apply' : 'dry-run', generatedAt: new Date().toISOString(), inventory: { cheques: cq.rowCount, impayes: iq.rowCount, uniqueEmails: groups.size }, compatibleCandidates: candidates.length, conflicts, fingerprint };
  if (!apply) { console.log(JSON.stringify(report, null, 2)); process.exitCode = conflicts.length ? 2 : 0; }
  else {
    const client = await central.connect();
    try {
      await client.query('BEGIN');
      const run = await client.query(`INSERT INTO migration_runs(source_fingerprint,status,report) VALUES($1,'running',$2) ON CONFLICT(source_fingerprint) DO NOTHING RETURNING id`, [fingerprint, report]);
      if (!run.rowCount) throw new Error('Cet inventaire a déjà été migré; aucune écriture effectuée.');
      for (const candidate of candidates) {
        const first = candidate.accounts[0];
        const inserted = await client.query(`INSERT INTO users(name,email,email_normalized,password_hash,active) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email_normalized) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [first.name, first.email.trim(), candidate.email, first.hash, first.active]);
        for (const account of candidate.accounts) {
          const userId = inserted.rows[0].id;
          await client.query(`INSERT INTO legacy_identities(central_user_id,source,legacy_user_id,metadata,migration_run_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(source,legacy_user_id) DO NOTHING`, [userId, account.source, account.legacyId, JSON.stringify({ importedRole: account.role }), run.rows[0].id]);
          const permissions = ['read', ...(account.role === 'Administrateur' || account.role === 'admin' ? ['write','admin','*'] : account.role === 'lecture_seule' ? [] : ['write'])];
          await client.query(`INSERT INTO module_access(user_id,module_code,role,permissions) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,module_code) DO NOTHING`, [userId, account.source, account.role, JSON.stringify(permissions)]);
        }
      }
      await client.query(`UPDATE migration_runs SET status='complete',report=$2 WHERE id=$1`, [run.rows[0].id, report]); await client.query('COMMIT');
      console.log(JSON.stringify({ ...report, migrated: candidates.length, migrationRunId: run.rows[0].id }, null, 2));
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
} finally { await Promise.all([central.end(), cheques.end(), impayes.end()]); }
