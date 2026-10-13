const router = require('express').Router();
const db = require('../db');
const { validate, checkSchema, checkUpdateSchema, statusSchema } = require('../validation');

router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        bank_account_id AS "bankAccountId",
        checkbook_id AS "checkbookId",
        type,
        number,
        partner_id AS "partnerId",
        partner_name AS "partnerName",
        emission_date::text AS "emissionDate",
        due_date::text AS "dueDate",
        amount::float,
        CASE
          WHEN status = 'En Circulation' AND due_date < CURRENT_DATE THEN 'En Retard'
          ELSE status
        END AS status,
        note,
        facture
      FROM checks
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', validate(checkSchema), async (req, res) => {
  try {
    const { bankAccountId, checkbookId, type, number, partnerId, partnerName, emissionDate, dueDate, amount, note, facture, status: bodyStatus } = req.body;
    const due = new Date(dueDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const status = bodyStatus || (due < today ? 'En Retard' : 'En Circulation');
    const id = `ch_${Date.now()}`;

    await db.query(
      `INSERT INTO checks (id, bank_account_id, checkbook_id, type, number, partner_id, partner_name, emission_date, due_date, amount, status, note, facture)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, bankAccountId, checkbookId || null, type, number, partnerId || null, partnerName, emissionDate, dueDate, amount, status, note || null, facture || null]
    );

    if (checkbookId) {
      await db.query('UPDATE checkbooks SET remaining = GREATEST(0, remaining - 1) WHERE id = $1', [checkbookId]);
    }

    res.status(201).json({ id, bankAccountId, checkbookId: checkbookId || undefined, type, number, partnerId: partnerId || '', partnerName, emissionDate, dueDate, amount, status, note, facture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/:id', validate(checkUpdateSchema), async (req, res) => {
  try {
    const { bankAccountId, type, number, partnerId, partnerName, emissionDate, dueDate, amount, status, note, facture } = req.body;

    const { rows } = await db.query('SELECT status, due_date, facture FROM checks WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Chèque introuvable.' });

    const oldCheck = rows[0];
    const currentStatus = oldCheck.status;
    let newStatus = status ?? currentStatus;
    if (dueDate && (newStatus === 'En Circulation' || newStatus === 'En Retard')) {
      const due = new Date(dueDate);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      newStatus = due < today ? 'En Retard' : 'En Circulation';
    }

    await db.query(
      `UPDATE checks SET
        bank_account_id = COALESCE($1, bank_account_id),
        type = COALESCE($2, type),
        number = COALESCE($3, number),
        partner_id = $4,
        partner_name = COALESCE($5, partner_name),
        emission_date = COALESCE($6, emission_date),
        due_date = COALESCE($7, due_date),
        amount = COALESCE($8, amount),
        status = $9,
        note = $10,
        facture = $11
       WHERE id = $12`,
      [bankAccountId, type, number, partnerId || null, partnerName, emissionDate, dueDate, amount, newStatus, note || null, facture || null, req.params.id]
    );

    const finalFacture = facture || oldCheck.facture;
    if (finalFacture) {
      if (newStatus === 'Payé') {
        await db.query('UPDATE instances SET payment_date = $1 WHERE facture = $2 AND payment_date IS NULL', [dueDate || oldCheck.due_date, finalFacture]);
      } else if (oldCheck.status === 'Payé' && newStatus !== 'Payé') {
        await db.query('UPDATE instances SET payment_date = NULL WHERE facture = $1', [finalFacture]);
      }
    }

    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.patch('/:id/status', validate(statusSchema), async (req, res) => {
  try {
    const { status } = req.body;

    const { rows } = await db.query('SELECT status, due_date, facture FROM checks WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Chèque introuvable.' });
    const oldCheck = rows[0];

    await db.query('UPDATE checks SET status = $1 WHERE id = $2', [status, req.params.id]);

    if (oldCheck.facture) {
      if (status === 'Payé') {
        await db.query('UPDATE instances SET payment_date = $1 WHERE facture = $2 AND payment_date IS NULL', [oldCheck.due_date, oldCheck.facture]);
      } else if (oldCheck.status === 'Payé' && status !== 'Payé') {
        await db.query('UPDATE instances SET payment_date = NULL WHERE facture = $1', [oldCheck.facture]);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT status, facture FROM checks WHERE id = $1', [req.params.id]);
    const check = rows[0];

    await db.query('DELETE FROM checks WHERE id = $1', [req.params.id]);

    if (check && check.status === 'Payé' && check.facture) {
      await db.query('UPDATE instances SET payment_date = NULL WHERE facture = $1', [check.facture]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
