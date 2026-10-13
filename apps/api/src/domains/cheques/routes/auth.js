const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requireAuth = require('../middleware/auth');
const { validate, loginSchema } = require('../validation');

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    if (user.status === 'Inactif') return res.status(403).json({ error: 'Ce compte est désactivé.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, role, status FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
