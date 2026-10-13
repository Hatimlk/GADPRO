import bcrypt from 'bcryptjs';
import pg from 'pg';

if (process.env.NODE_ENV === 'production') throw new Error('Cette vérification locale est interdite en production.');

const urls = {
  central: process.env.CENTRAL_DATABASE_URL,
  cheques: process.env.CHEQUES_DATABASE_URL,
  impayes: process.env.IMPAYES_DATABASE_URL,
};
for (const [name, value] of Object.entries(urls)) {
  if (!value) throw new Error(`${name}: variable de connexion manquante.`);
  const parsed = new URL(value);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) throw new Error(`${name}: seule une base locale isolée est autorisée.`);
}

const central = new pg.Pool({ connectionString: urls.central });
const cheques = new pg.Pool({ connectionString: urls.cheques });
const impayes = new pg.Pool({ connectionString: urls.impayes });
const password = 'SyntheticOnly!2026';
const prefix = 'rbac.verify';
const emails = {
  cheques: `${prefix}.cheques@gadimat.test`,
  commercial: `${prefix}.commercial@gadimat.test`,
  other: `${prefix}.other@gadimat.test`,
  dual: `${prefix}.dual@gadimat.test`,
  disabled: `${prefix}.disabled@gadimat.test`,
  readonly: `${prefix}.readonly@gadimat.test`,
  platform: `${prefix}.platform@gadimat.test`,
  managed: `${prefix}.managed@gadimat.test`,
};
const createdDossiers = [];

function assert(condition, message) {
  if (!condition) throw new Error(`ÉCHEC: ${message}`);
  console.log(`OK: ${message}`);
}

class Session {
  cookies = new Map();
  absorb(response) {
    for (const header of response.headers.getSetCookie?.() || []) {
      const [pair] = header.split(';');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator); const value = pair.slice(separator + 1);
      if (value) this.cookies.set(name, value); else this.cookies.delete(name);
    }
  }
  cookieHeader() { return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '); }
  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookies.size) headers.Cookie = this.cookieHeader();
    const response = await fetch(`http://127.0.0.1:4000${path}`, { ...options, headers });
    this.absorb(response);
    const text = await response.text();
    let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: response.status, body };
  }
}

async function login(email) {
  const session = new Session();
  const csrf = await session.request('/api/auth/csrf');
  assert(csrf.status === 200, `jeton CSRF délivré pour ${email}`);
  const result = await session.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.body.csrfToken },
    body: JSON.stringify({ email, password }),
  });
  return { session, result };
}

async function insertCentral(email, name, hash, accesses, active = true, platformAdmin = false) {
  const user = await central.query(
    `INSERT INTO users(name,email,email_normalized,password_hash,active,platform_admin)
     VALUES($1,$2,$2,$3,$4,$5) RETURNING id`, [name, email, hash, active, platformAdmin],
  );
  for (const access of accesses) {
    await central.query(
      `INSERT INTO module_access(user_id,module_code,role,permissions,data_scope)
       VALUES($1,$2,$3,$4,$5)`,
      [user.rows[0].id, access.module, access.role, JSON.stringify(access.permissions), JSON.stringify(access.role === 'commercial' ? { own: true } : {})],
    );
    if (access.legacyUserId) await central.query(
      `INSERT INTO legacy_identities(central_user_id,source,legacy_user_id) VALUES($1,$2,$3)
       ON CONFLICT(central_user_id,source) DO UPDATE SET legacy_user_id=EXCLUDED.legacy_user_id`,
      [user.rows[0].id, access.module === 'consommations' ? 'cheques' : access.module, String(access.legacyUserId)],
    );
  }
}

async function cleanup() {
  if (createdDossiers.length) await impayes.query('DELETE FROM dossiers WHERE id = ANY($1::uuid[])', [createdDossiers]);
  await central.query('DELETE FROM users WHERE email_normalized LIKE $1', [`${prefix}.%@gadimat.test`]);
  await impayes.query('DELETE FROM users WHERE email LIKE $1', [`${prefix}.%@gadimat.test`]);
  await cheques.query('DELETE FROM users WHERE email LIKE $1', [`${prefix}.%@gadimat.test`]);
}

try {
  await cleanup();
  const hash = await bcrypt.hash(password, 12);
  const chequeUsers = {};
  for (const key of ['cheques', 'dual', 'disabled', 'managed']) {
    const result = await cheques.query(
      `INSERT INTO users(name,email,password_hash,role,status) VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [`Synthétique ${key}`, emails[key], hash, 'Utilisateur', key === 'disabled' ? 'Inactif' : 'Actif'],
    );
    chequeUsers[key] = result.rows[0].id;
  }
  const impayesUsers = {};
  for (const key of ['commercial', 'other', 'dual', 'readonly']) {
    const role = key === 'dual' ? 'responsable_recouvrement' : key === 'readonly' ? 'lecture_seule' : 'commercial';
    const result = await impayes.query(
      `INSERT INTO users(nom,email,mot_de_passe_hash,role,actif) VALUES($1,$2,$3,$4,true) RETURNING id`,
      [`Synthétique ${key}`, emails[key], hash, role],
    );
    impayesUsers[key] = result.rows[0].id;
  }
  const own = await impayes.query(
    `INSERT INTO dossiers(banque,montant,type_valeur,numero_valeur,nom_tire,relation,commercial_id)
     VALUES('TEST',100,'CHQ',$1,'Client synthétique propre','CD',$2) RETURNING id`, [`RBAC-${Date.now()}-OWN`, impayesUsers.commercial],
  );
  const foreign = await impayes.query(
    `INSERT INTO dossiers(banque,montant,type_valeur,numero_valeur,nom_tire,relation,commercial_id)
     VALUES('TEST',200,'CHQ',$1,'Client synthétique tiers','CD',$2) RETURNING id`, [`RBAC-${Date.now()}-OTHER`, impayesUsers.other],
  );
  createdDossiers.push(own.rows[0].id, foreign.rows[0].id);

  await insertCentral(emails.cheques, 'Synthétique Chèques', hash, [
    { module: 'cheques', role: 'Utilisateur', permissions: ['read', 'write'], legacyUserId: chequeUsers.cheques },
  ]);
  await insertCentral(emails.commercial, 'Synthétique Commercial', hash, [
    { module: 'impayes', role: 'commercial', permissions: ['read', 'write'], legacyUserId: impayesUsers.commercial },
  ]);
  await insertCentral(emails.dual, 'Synthétique Double', hash, [
    { module: 'cheques', role: 'Utilisateur', permissions: ['read', 'write'], legacyUserId: chequeUsers.dual },
    { module: 'impayes', role: 'responsable_recouvrement', permissions: ['read', 'write'], legacyUserId: impayesUsers.dual },
    { module: 'consommations', role: 'Utilisateur', permissions: ['read', 'write'], legacyUserId: chequeUsers.dual },
  ]);
  await insertCentral(emails.disabled, 'Synthétique Désactivé', hash, [
    { module: 'cheques', role: 'Utilisateur', permissions: ['read', 'write'], legacyUserId: chequeUsers.disabled },
  ], false);
  await insertCentral(emails.readonly, 'Synthétique Lecture', hash, [
    { module: 'impayes', role: 'lecture_seule', permissions: ['read'], legacyUserId: impayesUsers.readonly },
  ]);
  await insertCentral(emails.platform, 'Synthétique Plateforme', hash, [], true, true);

  const platform = await login(emails.platform);
  assert(platform.result.status === 200, 'connexion de l’administrateur plateforme synthétique');
  const platformCsrf = decodeURIComponent(platform.session.cookies.get('gadimat_csrf'));
  const managedCreate = await platform.session.request('/api/administration/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': platformCsrf },
    body: JSON.stringify({
      name: 'Compte géré synthétique', email: emails.managed, password, platformAdmin: false,
      accesses: [{ module: 'cheques', role: 'Utilisateur', legacyUserId: String(chequeUsers.managed) }],
    }),
  });
  assert(managedCreate.status === 201, 'création d’un compte par l’administration centrale');
  const managedStatus = await platform.session.request(`/api/administration/users/${managedCreate.body.id}/status`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': platformCsrf }, body: JSON.stringify({ active: false }),
  });
  assert(managedStatus.status === 200 && managedStatus.body.active === false, 'désactivation immédiate d’un compte central');
  assert((await login(emails.managed)).result.status === 403, 'connexion refusée après désactivation administrative');

  const chequesOnly = await login(emails.cheques);
  assert(chequesOnly.result.status === 200, 'connexion du compte Chèques uniquement');
  assert((await chequesOnly.session.request('/api/cheques/bank-accounts')).status === 200, 'accès autorisé à Chèques');
  assert((await chequesOnly.session.request('/api/impayes/dossiers')).status === 403, 'accès direct Impayés interdit au compte Chèques');
  assert((await chequesOnly.session.request('/api/consommations/records')).status === 403, 'permission Consommations indépendante');
  assert((await chequesOnly.session.request('/api/administration/users')).status === 403, 'un utilisateur de module n’est pas administrateur plateforme');

  const commercial = await login(emails.commercial);
  assert(commercial.result.status === 200, 'connexion du commercial Impayés');
  const dossiers = await commercial.session.request('/api/impayes/dossiers?page=1&limit=100');
  assert(dossiers.status === 200, 'lecture des dossiers du commercial');
  assert(dossiers.body.dossiers.some((dossier) => dossier.id === own.rows[0].id), 'le commercial voit son dossier synthétique');
  assert(!dossiers.body.dossiers.some((dossier) => dossier.id === foreign.rows[0].id), 'le commercial ne voit pas le dossier d’un tiers');
  assert((await commercial.session.request('/api/cheques/bank-accounts')).status === 403, 'accès direct Chèques interdit au commercial');

  const dual = await login(emails.dual);
  assert(dual.result.status === 200, 'connexion du compte autorisé aux deux modules');
  assert((await dual.session.request('/api/cheques/bank-accounts')).status === 200, 'compte double autorisé à Chèques');
  assert((await dual.session.request('/api/impayes/dossiers')).status === 200, 'compte double autorisé à Impayés');
  assert((await dual.session.request('/api/consommations/records')).status === 200, 'compte double autorisé à Consommations');

  const disabled = await login(emails.disabled);
  assert(disabled.result.status === 403, 'connexion refusée au compte désactivé');

  const readonly = await login(emails.readonly);
  assert(readonly.result.status === 200, 'connexion du compte Impayés lecture seule');
  const csrf = readonly.session.cookies.get('gadimat_csrf');
  const forbiddenWrite = await readonly.session.request('/api/impayes/dossiers', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) }, body: '{}',
  });
  assert(forbiddenWrite.status === 403, 'écriture API interdite à un rôle lecture seule');
  console.log('Vérification RBAC locale terminée avec succès.');
} finally {
  await cleanup().catch((error) => console.error('Nettoyage incomplet:', error.message));
  await Promise.all([central.end(), cheques.end(), impayes.end()]);
}
