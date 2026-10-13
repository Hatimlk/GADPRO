const router = require('express').Router();
const db = require('../db');
const { validate, checkbookSchema } = require('../validation');

router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        cb.id,
        cb.bank_account_id AS "bankAccountId",
        cb.bank_name AS "bankName",
        cb.type,
        cb.creation_date::text AS "creationDate",
        cb.start_number AS "startNumber",
        cb.end_number AS "endNumber",
        cb.remaining,
        json_build_object(
          'nonPaid',   COUNT(CASE WHEN c.status NOT IN ('Payé','Annulé') THEN 1 END)::int,
          'paid',      COUNT(CASE WHEN c.status = 'Payé'   THEN 1 END)::int,
          'cancelled', COUNT(CASE WHEN c.status = 'Annulé' THEN 1 END)::int
        ) AS totals
      FROM checkbooks cb
      LEFT JOIN checks c ON c.checkbook_id = cb.id
      GROUP BY cb.id
      ORDER BY cb.created_at
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', validate(checkbookSchema), async (req, res) => {
  try {
    const { bankAccountId, bankName, type, startNumber, endNumber } = req.body;
    const start = parseInt(startNumber);
    const end = parseInt(endNumber);
    const remaining = !isNaN(start) && !isNaN(end) ? end - start + 1 : 0;
    const id = `cb_${Date.now()}`;
    const creationDate = new Date().toISOString().split('T')[0];

    await db.query(
      `INSERT INTO checkbooks (id, bank_account_id, bank_name, type, creation_date, start_number, end_number, remaining)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, bankAccountId, bankName, type, creationDate, startNumber, endNumber, remaining]
    );

    res.status(201).json({
      id, bankAccountId, bankName, type, creationDate, startNumber, endNumber, remaining,
      totals: { nonPaid: 0, paid: 0, cancelled: 0 },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM checkbooks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
