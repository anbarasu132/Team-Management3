const db = require('../config/db');

async function getAdminAuditLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const [rows] = await db.query(
      `SELECT a.id, a.user_id, a.team_id, a.method, a.path, a.status_code, a.action, a.details, a.created_at,
              u.name AS user_name, u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getTeamAuditLogs(req, res, next) {
  try {
    let teamId = req.user.team_id;
    if (!teamId) {
      const [teamRows] = await db.query('SELECT id FROM teams WHERE leader_id = ? LIMIT 1', [req.user.id]);
      teamId = teamRows.length ? teamRows[0].id : null;
    }

    if (!teamId) {
      return res.json([]);
    }

    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const [rows] = await db.query(
      `SELECT a.id, a.user_id, a.team_id, a.method, a.path, a.status_code, a.action, a.details, a.created_at,
              u.name AS user_name, u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.team_id = ?
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [teamId, limit]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAdminAuditLogs,
  getTeamAuditLogs
};
