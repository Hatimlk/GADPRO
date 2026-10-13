import { Router } from 'express';
import * as XLSX from 'xlsx';
import { query } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { ensurePorteurColumn } from '../services/schema.js';
import { validateQuery, exportQuerySchema } from '../schemas/validation.js';
import { normalizeCommercialIdentity, normalizedCommercialIdentitySql } from '../services/commercialIdentity.js';

const router = Router();
router.use(authenticateToken);

function getPorteur(nomTire, relation) {
  if (relation !== 'CDC') return '';
  const separatorIndex = String(nomTire || '').indexOf(':');
  return separatorIndex === -1 ? '' : String(nomTire).slice(separatorIndex + 1).trim();
}

// Neutralise l'injection de formule Excel/Sheets ("CSV injection") : un champ libre
// (nom_tire, observations, ...) commençant par =, +, -, @ ou une tabulation serait
// sinon interprété comme une formule par le tableur à l'ouverture du fichier.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
function sanitizeCell(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  return FORMULA_TRIGGER.test(str) ? `'${str}` : str;
}

// GET /api/export/excel
router.get('/excel', validateQuery(exportQuerySchema), async (req, res) => {
  try {
    await ensurePorteurColumn();
    const conditions = [];
    const params = [];
    let idx = 1;
    conditions.push('v.actif = true');
    if (req.user.role === 'commercial') {
      conditions.push(`(s.commercial_id = $${idx} OR ${normalizedCommercialIdentitySql("COALESCE(NULLIF(BTRIM(u.nom), ''), v.erp_commercial_nom)")} = $${idx + 1})`);
      params.push(req.user.id, normalizeCommercialIdentity(req.user.nom)); idx += 2;
    }

    const { search, banque, statut, relation, type_valeur, date_debut, date_fin, commercial_id } = req.validatedQuery;
    if (search) { conditions.push(`(v.nom_tire ILIKE $${idx} OR v.numero_valeur ILIKE $${idx} OR v.banque ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (banque) { conditions.push(`v.banque = $${idx}`); params.push(banque); idx++; }
    if (statut) { conditions.push(`COALESCE(s.statut,'Attente retour du client') = $${idx}`); params.push(statut); idx++; }
    if (relation) { conditions.push(`v.relation = $${idx}`); params.push(relation); idx++; }
    if (type_valeur) { conditions.push(`v.type_valeur = $${idx}`); params.push(type_valeur); idx++; }
    if (date_debut) { conditions.push(`v.date_saisie >= $${idx}`); params.push(date_debut); idx++; }
    if (date_fin) { conditions.push(`v.date_saisie <= $${idx}`); params.push(date_fin); idx++; }
    if (commercial_id) { conditions.push(`COALESCE(NULLIF(BTRIM(u.nom), ''),NULLIF(BTRIM(v.erp_commercial_nom),'')) = $${idx}`); params.push(commercial_id); idx++; }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await query(
      `SELECT v.date_saisie,v.date_facture,v.date_echeance,v.banque,v.montant,v.type_valeur,v.numero_valeur,
              v.nom_tire,v.porteur,v.relation,s.observations,
              COALESCE(NULLIF(BTRIM(u.nom),''),v.erp_commercial_nom) AS commercial,
              COALESCE(s.statut,'Attente retour du client') AS statut,
              s.date_derniere_action,COALESCE(s.date_creation,v.synced_at) AS date_creation
       FROM erp_impayes_snapshot v
       LEFT JOIN erp_dossier_suivi s ON s.erp_voucher_id=v.erp_voucher_id
       LEFT JOIN users u ON u.id=s.commercial_id
       ${where} ORDER BY v.date_saisie DESC`,
      params
    );

    const data = result.rows.map(r => ({
      'Date': r.date_saisie,
      'Date facture': r.date_facture,
      'Échéance': r.date_echeance,
      'Banque': sanitizeCell(r.banque),
      'Montant': parseFloat(r.montant),
      'Type': r.type_valeur,
      'N Valeur': sanitizeCell(r.numero_valeur),
      'Partenaire': sanitizeCell(r.nom_tire),
      'Porteur': sanitizeCell(r.porteur || getPorteur(r.nom_tire, r.relation)),
      'Relation': r.relation,
      'Observation': sanitizeCell(r.observations),
      'Commercial': sanitizeCell(r.commercial),
      'Statut': sanitizeCell(r.statut),
      'Derniere action': r.date_derniere_action,
      'Date creation': r.date_creation,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 6 }, { wch: 15 },
      { wch: 25 }, { wch: 20 }, { wch: 6 }, { wch: 30 }, { wch: 20 },
      { wch: 25 }, { wch: 18 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Impayes');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="impayes_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('Erreur export Excel:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
