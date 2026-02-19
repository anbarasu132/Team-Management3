const db = require('../config/db');

async function notifyUser(userId, title, message, type = 'info') {
  await db.query(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, 0)',
    [userId, title, message, type]
  );
}

async function notifyAdmins(title, message, type = 'info') {
  const [admins] = await db.query('SELECT id FROM users WHERE role = ?', ['admin']);
  if (!admins.length) return;

  const values = admins.map((admin) => [admin.id, title, message, type, 0]);
  await db.query(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES ?',
    [values]
  );
}

module.exports = {
  notifyUser,
  notifyAdmins
};
