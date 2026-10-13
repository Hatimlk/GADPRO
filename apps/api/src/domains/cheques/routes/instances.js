const router = require('express').Router();
const db = require('../db');
const { validate, instanceSchema } = require('../validation');

router.get('/', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        id, 
        date::text AS "date", 
        facture, 
        partner_id AS "partnerId", 
        partner_name AS "partnerName", 
        amount::float AS "amount", 
        payment_delay AS "paymentDelay", 
        convention, 
        mdp, 
        payment_date::text AS "paymentDate", 
        observation 
      FROM instances 
      ORDER BY date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/', validate(instanceSchema), async (req, res) => {
  try {
    const { date, facture, partnerId, partnerName, amount, paymentDelay, convention, mdp, paymentDate, observation } = req.body;

    const { rows } = await db.query(
      `INSERT INTO instances (date, facture, partner_id, partner_name, amount, payment_delay, convention, mdp, payment_date, observation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        date,
        facture,
        partnerId || null,
        partnerName,
        amount,
        paymentDelay,
        convention,
        mdp,
        paymentDate || null,
        observation || null
      ]
    );

    res.status(201).json({
      id: rows[0].id,
      date,
      facture,
      partnerId: partnerId || '',
      partnerName,
      amount,
      paymentDelay,
      convention,
      mdp,
      paymentDate: paymentDate || null,
      observation: observation || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/:id', validate(instanceSchema), async (req, res) => {
  try {
    const { date, facture, partnerId, partnerName, amount, paymentDelay, convention, mdp, paymentDate, observation } = req.body;

    await db.query(
      `UPDATE instances 
       SET date = $1, facture = $2, partner_id = $3, partner_name = $4, amount = $5, payment_delay = $6, convention = $7, mdp = $8, payment_date = $9, observation = $10
       WHERE id = $11`,
      [
        date,
        facture,
        partnerId || null,
        partnerName,
        amount,
        paymentDelay,
        convention,
        mdp,
        paymentDate || null,
        observation || null,
        req.params.id
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM instances WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
