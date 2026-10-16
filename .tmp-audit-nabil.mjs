import pg from 'pg';

const central = new pg.Pool({ connectionString: process.env.CENTRAL_DATABASE_URL, max: 1 });
const impayes = new pg.Pool({ connectionString: process.env.IMPAYES_DATABASE_URL, max: 1 });

try {
  const [legacyUsers, erpNames, trackedAssignments, centralAccounts, userReferences] = await Promise.all([
    impayes.query(
      `SELECT id,nom,email,role,actif,date_creation
       FROM users WHERE nom ILIKE '%nabil%' OR email ILIKE '%nabil%'
       ORDER BY email,id`,
    ),
    impayes.query(
      `SELECT COALESCE(erp_commercial_nom,'<vide>') AS commercial,COUNT(*)::int AS dossiers
       FROM erp_impayes_snapshot
       WHERE actif=true AND erp_commercial_nom ILIKE '%nabil%'
       GROUP BY erp_commercial_nom ORDER BY commercial`,
    ),
    impayes.query(
      `SELECT u.id,u.nom,u.email,COUNT(s.erp_voucher_id)::int AS dossiers_suivis
       FROM users u LEFT JOIN erp_dossier_suivi s ON s.commercial_id=u.id
       WHERE u.nom ILIKE '%nabil%' OR u.email ILIKE '%nabil%'
       GROUP BY u.id,u.nom,u.email ORDER BY u.email,u.id`,
    ),
    central.query(
      `SELECT u.id,u.name,u.email,u.active,u.platform_admin,li.source,li.legacy_user_id,
              ma.module_code,ma.role,ma.permissions,ma.data_scope,ma.active AS access_active
       FROM users u
       LEFT JOIN legacy_identities li ON li.central_user_id=u.id
       LEFT JOIN module_access ma ON ma.user_id=u.id
       WHERE u.name ILIKE '%nabil%' OR u.email ILIKE '%nabil%'
       ORDER BY u.email,li.source,ma.module_code`,
    ),
    impayes.query(
      `SELECT tc.table_name,kcu.column_name,rc.delete_rule
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name=kcu.constraint_name AND tc.constraint_schema=kcu.constraint_schema
       JOIN information_schema.referential_constraints rc
         ON tc.constraint_name=rc.constraint_name AND tc.constraint_schema=rc.constraint_schema
       JOIN information_schema.constraint_column_usage ccu
         ON rc.unique_constraint_name=ccu.constraint_name AND rc.unique_constraint_schema=ccu.constraint_schema
       WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='users' AND ccu.column_name='id'
       ORDER BY tc.table_name,kcu.column_name`,
    ),
  ]);
  const referenceCounts = [];
  for (const reference of userReferences.rows) {
    if (!/^[a-z_]+$/.test(reference.table_name) || !/^[a-z_]+$/.test(reference.column_name)) continue;
    const counts = await impayes.query(
      `SELECT COUNT(*) FILTER (WHERE ${reference.column_name}=$1)::int AS duplicate_count,
              COUNT(*) FILTER (WHERE ${reference.column_name}=$2)::int AS retained_count
       FROM ${reference.table_name}`,
      ['50b24b44-151d-4198-ab6f-49cf91324cc4', '03461dcc-451d-4047-865b-b8fd64d4cd08'],
    );
    referenceCounts.push({ ...reference, ...counts.rows[0] });
  }
  console.log(JSON.stringify({
    legacyUsers: legacyUsers.rows,
    erpNames: erpNames.rows,
    trackedAssignments: trackedAssignments.rows,
    centralAccounts: centralAccounts.rows,
    referenceCounts,
  }, null, 2));
} finally {
  await Promise.all([central.end(), impayes.end()]);
}
