const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { markUserOnline } = require('../utils/presence');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query('SELECT id, role, team_id FROM users WHERE id = ?', [payload.id]);
    if (!rows.length) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = rows[0];
    markUserOnline(req.user.id);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
