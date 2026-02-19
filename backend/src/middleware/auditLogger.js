const db = require('../config/db');

const trackedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  const clone = { ...body };
  if (clone.password) clone.password = '[REDACTED]';
  return clone;
}

function auditLogger(req, res, next) {
  if (!trackedMethods.has(req.method)) {
    return next();
  }

  const startedAt = Date.now();
  res.on('finish', () => {
    if (!req.user || res.statusCode >= 400) return;

    const details = {
      body: sanitizeBody(req.body),
      query: req.query,
      duration_ms: Date.now() - startedAt
    };

    db.query(
      `INSERT INTO audit_logs (user_id, team_id, method, path, status_code, action, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.user.team_id || null,
        req.method,
        req.originalUrl,
        res.statusCode,
        `${req.method} ${req.baseUrl || ''}${req.route?.path || req.path}`,
        JSON.stringify(details)
      ]
    ).catch((error) => {
      console.error('Audit log insert failed:', error.message);
    });
  });

  return next();
}

module.exports = auditLogger;
