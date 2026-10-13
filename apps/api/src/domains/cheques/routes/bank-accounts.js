const router = require('express').Router();
const db = require('../db');
const { validate, bankAccountSchema } = require('../validation');

const WITH_TOTALS = `
  SELECT
    ba.id,
    ba.bank_name AS "bankName",
    ba.rib,
    'c1' AS "companyId",
    COUNT(DISTINCT cb.id)::int AS "checkbooksCount",
    json_build_object(
      'nonPaid',    COALESCE(SUM(CASE WHEN c.status NOT IN ('Payé','Annulé') THEN c.amount ELSE 0 END)::float, 0),
      'paid',       COALESCE(SUM(CASE WHEN c.status = 'Payé'   THEN c.amount ELSE 0 END)::float, 0),
      'cancelled',  COALESCE(SUM(CASE WHEN c.status = 'Annulé' THEN c.amount ELSE 0 END)::float, 0)
    ) AS totals
  FROM bank_accounts ba
  LEFT JOIN checkbooks cb ON cb.bank_account_id = ba.id
  LEFT JOIN checks c ON c.bank_account_id = ba.id
`;

router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(`${WITH_TOTALS} GROUP BY ba.id ORDER BY ba.created_at`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', validate(bankAccountSchema), async (req, res) => {
  try {
    const { bankName, rib } = req.body;
    const id = `ba_${Date.now()}`;
    await db.query('INSERT INTO bank_accounts (id, bank_name, rib) VALUES ($1, $2, $3)', [id, bankName, rib]);
    res.status(201).json({ id, bankName, rib, companyId: 'c1', checkbooksCount: 0, totals: { nonPaid: 0, paid: 0, cancelled: 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/:id', validate(bankAccountSchema), async (req, res) => {
  try {
    const { bankName, rib } = req.body;
    await db.query('UPDATE bank_accounts SET bank_name = $1, rib = $2 WHERE id = $3', [bankName, rib, req.params.id]);
    await db.query('UPDATE checkbooks SET bank_name = $1 WHERE bank_account_id = $2', [bankName, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM bank_accounts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
