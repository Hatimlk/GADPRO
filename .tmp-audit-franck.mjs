import pg from 'pg';

const targetEmail = 'franck.guillet@gadimat.com';
const central = new pg.Pool({ connectionString: process.env.CENTRAL_DATABASE_URL, max: 1 });
const cheques = new pg.Pool({ connectionString: process.env.CHEQUES_DATABASE_URL, max: 1 });
const impayes = new pg.Pool({ connectionString: process.env.IMPAYES_DATABASE_URL, max: 1 });

try {
  const [centralCandidates, chequeCandidates, impayeCandidates] = await Promise.all([
    central.query(
      `SELECT id,name,email,active,platform_admin
       FROM users
       WHERE lower(email)=lower($1) OR name ILIKE '%franck%' OR id='5020eeeb-4bd4-4e20-a4cc-98d07954fc4c'
       ORDER BY email`,
      [targetEmail],
    ),
    cheques.query(
      `SELECT id,name,email,role,status
       FROM users
       WHERE lower(email)=lower($1) OR name ILIKE '%franck%'
       ORDER BY email`,
      [targetEmail],
    ),
    impayes.query(
      `SELECT id,nom AS name,email,role,actif AS active
       FROM users
       WHERE lower(email)=lower($1) OR nom ILIKE '%franck%'
       ORDER BY email`,
      [targetEmail],
    ),
  ]);

  const legacyIds = [
    ...chequeCandidates.rows.map((item) => ['cheques', String(item.id)]),
    ...impayeCandidates.rows.map((item) => ['impayes', String(item.id)]),
  ];
  const links = await central.query(
    `SELECT li.source,li.legacy_user_id,u.id AS central_user_id,u.name,u.email,u.active,u.platform_admin,
            COALESCE((SELECT json_agg(json_build_object('module',ma.module_code,'role',ma.role,'active',ma.active)
                     ORDER BY ma.module_code) FROM module_access ma WHERE ma.user_id=u.id),'[]') AS accesses
     FROM legacy_identities li
     JOIN users u ON u.id=li.central_user_id
     WHERE (u.name ILIKE '%franck%' OR lower(u.email)=lower($1))
        OR (li.source,li.legacy_user_id) IN (
          SELECT source,legacy_id FROM json_to_recordset($2::json) AS x(source text,legacy_id text)
        )
     ORDER BY u.email,li.source`,
    [targetEmail, JSON.stringify(legacyIds.map(([source, legacy_id]) => ({ source, legacy_id })))],
  );

  console.log(JSON.stringify({
    centralCandidates: centralCandidates.rows,
    chequeCandidates: chequeCandidates.rows,
    impayeCandidates: impayeCandidates.rows,
    identityOwners: links.rows,
  }, null, 2));
} finally {
  await Promise.all([central.end(), cheques.end(), impayes.end()]);
}
