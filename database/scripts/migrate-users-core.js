export const normalizeEmail = (value) => String(value || '').trim().toLowerCase().normalize('NFKC');
export const bcryptCompatible = (hash) => /^\$2[aby]\$\d\d\$/.test(hash || '');

const identityKey = (source, legacyId) => `${source}:${legacyId}`;

export function analyzeUserMigration(sourceAccounts, centralUsers = [], centralIdentities = []) {
  const groups = new Map();
  for (const account of sourceAccounts) {
    const email = normalizeEmail(account.email);
    groups.set(email, [...(groups.get(email) || []), account]);
  }

  const centralByEmail = new Map(centralUsers.map((user) => [normalizeEmail(user.email_normalized || user.email), user]));
  const centralById = new Map(centralUsers.map((user) => [user.id, user]));
  const identityByLegacy = new Map(centralIdentities.map((identity) => [identityKey(identity.source, identity.legacy_user_id), identity]));
  const identitiesByCentralSource = new Map(centralIdentities.map((identity) => [identityKey(identity.central_user_id, identity.source), identity]));
  const conflicts = [];
  const candidates = [];

  for (const [email, accounts] of groups) {
    const reasons = [];
    const hashes = new Set(accounts.map((account) => account.hash));
    const statuses = new Set(accounts.map((account) => account.active));
    const sources = new Set(accounts.map((account) => account.source));
    const emailCentralUser = centralByEmail.get(email);

    if (!email) reasons.push('email_invalide');
    if (accounts.some((account) => !bcryptCompatible(account.hash))) reasons.push('empreinte_non_bcrypt');
    if (hashes.size > 1) reasons.push('empreintes_bcrypt_differentes');
    if (statuses.size > 1) reasons.push('statuts_differents');
    if (sources.size < accounts.length) reasons.push('plusieurs_identifiants_meme_source');
    const mappedCentralIds = new Set();
    for (const account of accounts) {
      const existing = identityByLegacy.get(identityKey(account.source, account.legacyId));
      if (existing) mappedCentralIds.add(existing.central_user_id);
      const mappedUser = existing && centralById.get(existing.central_user_id);
      if (mappedUser && normalizeEmail(mappedUser.email_normalized || mappedUser.email) !== email) {
        reasons.push('correspondance_legacy_vers_autre_compte');
      }
      if (existing && emailCentralUser && existing.central_user_id !== emailCentralUser.id) {
        reasons.push('correspondance_legacy_vers_autre_compte');
      }
    }
    if (mappedCentralIds.size > 1) reasons.push('correspondances_legacy_divergentes');
    const targetCentralId = emailCentralUser?.id || [...mappedCentralIds][0];
    const targetCentralUser = targetCentralId && centralById.get(targetCentralId);
    if (targetCentralUser && targetCentralUser.password_hash !== accounts[0].hash) reasons.push('empreinte_bcrypt_centrale_differente');
    if (targetCentralUser && targetCentralUser.active !== accounts[0].active) reasons.push('statut_central_different');
    if (targetCentralId) {
      for (const account of accounts) {
        const occupied = identitiesByCentralSource.get(identityKey(targetCentralId, account.source));
        if (occupied && String(occupied.legacy_user_id) !== String(account.legacyId)) {
          reasons.push('source_deja_liee_a_un_autre_identifiant');
        }
      }
    }

    const uniqueReasons = [...new Set(reasons)];
    if (uniqueReasons.length) {
      conflicts.push({
        email: email || '(vide)',
        sources: accounts.map((account) => account.source),
        legacyIds: accounts.map((account) => identityKey(account.source, account.legacyId)),
        reasons: uniqueReasons,
      });
    } else {
      candidates.push({ email, accounts, centralUserId: targetCentralId || null });
    }
  }

  return { groups, conflicts, candidates };
}

export function assertMigrationCanApply(analysis) {
  if (!analysis.conflicts.length) return;
  const error = new Error(`Migration refusée: ${analysis.conflicts.length} conflit(s) à résoudre avant toute écriture.`);
  error.code = 'MIGRATION_CONFLICT';
  error.conflicts = analysis.conflicts;
  throw error;
}
