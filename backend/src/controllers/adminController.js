const { body, param } = require('express-validator');
const db = require('../config/db');
const { notifyUser } = require('../utils/notifications');
const { getPaginationParams, pagedResponse } = require('../utils/pagination');
const { mapOnlineStatus, removeUserPresence } = require('../utils/presence');

const newsValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required')
];

const vacancyValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('slots_available').isInt({ min: 1 }).withMessage('Slots available must be at least 1')
];

const idValidation = [param('id').isInt({ min: 1 }).withMessage('Invalid id')];
const teamRequestIdValidation = [param('requestId').isInt({ min: 1 }).withMessage('Invalid requestId')];
const teamRequestResponseValidation = [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected')
];

async function createNews(req, res, next) {
  try {
    const { title, content } = req.body;
    const [result] = await db.query('INSERT INTO news (title, content) VALUES (?, ?)', [title, content]);
    return res.status(201).json({ id: result.insertId, title, content });
  } catch (error) {
    return next(error);
  }
}

async function updateNews(req, res, next) {
  try {
    const { title, content } = req.body;
    const [result] = await db.query('UPDATE news SET title = ?, content = ? WHERE id = ?', [title, content, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'News not found' });
    }
    return res.json({ message: 'News updated' });
  } catch (error) {
    return next(error);
  }
}

async function deleteNews(req, res, next) {
  try {
    const [result] = await db.query('DELETE FROM news WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'News not found' });
    }
    return res.json({ message: 'News deleted' });
  } catch (error) {
    return next(error);
  }
}

async function createVacancy(req, res, next) {
  try {
    const { title, description, slots_available } = req.body;
    const [result] = await db.query(
      'INSERT INTO team_vacancies (title, description, slots_available) VALUES (?, ?, ?)',
      [title, description, slots_available]
    );
    return res.status(201).json({ id: result.insertId, title, description, slots_available });
  } catch (error) {
    return next(error);
  }
}

async function updateVacancy(req, res, next) {
  try {
    const { title, description, slots_available } = req.body;
    const [result] = await db.query(
      'UPDATE team_vacancies SET title = ?, description = ?, slots_available = ? WHERE id = ?',
      [title, description, slots_available, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }
    return res.json({ message: 'Vacancy updated' });
  } catch (error) {
    return next(error);
  }
}

async function deleteVacancy(req, res, next) {
  try {
    const [result] = await db.query('DELETE FROM team_vacancies WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }
    return res.json({ message: 'Vacancy deleted' });
  } catch (error) {
    return next(error);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const q = (req.query.q || '').trim();
    const role = (req.query.role || '').trim();

    const conditions = [];
    const params = [];

    if (q) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (role) {
      conditions.push('u.role = ?');
      params.push(role);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users u
       ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.team_id, u.created_at
       FROM users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json(pagedResponse(mapOnlineStatus(rows), countRows[0].total, page, limit));
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const userId = Number(req.params.id);

    if (req.user.id === userId) {
      await conn.rollback();
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const [rows] = await conn.query('SELECT id, role FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    await conn.query('UPDATE teams SET leader_id = NULL WHERE leader_id = ?', [userId]);
    await conn.query('UPDATE teams SET co_leader_id = NULL WHERE co_leader_id = ?', [userId]);

    const [result] = await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'User not found' });
    }
    removeUserPresence(userId);

    await conn.commit();
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await conn.rollback();
    return next(error);
  } finally {
    conn.release();
  }
}

async function getAllTeams(req, res, next) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const q = (req.query.q || '').trim();

    const conditions = [];
    const params = [];

    if (q) {
      conditions.push('(t.name LIKE ? OR l.name LIKE ? OR c.name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM teams t
       LEFT JOIN users l ON l.id = t.leader_id
       LEFT JOIN users c ON c.id = t.co_leader_id
       ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT t.id, t.name, t.created_at,
              l.id AS leader_id, l.name AS leader_name,
              c.id AS co_leader_id, c.name AS co_leader_name,
              (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id AND u.role = 'participant') AS participant_count
       FROM teams t
       LEFT JOIN users l ON l.id = t.leader_id
       LEFT JOIN users c ON c.id = t.co_leader_id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return res.json(pagedResponse(rows, countRows[0].total, page, limit));
  } catch (error) {
    return next(error);
  }
}

async function deleteTeam(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const teamId = Number(req.params.id);

    const [teamRows] = await conn.query('SELECT id FROM teams WHERE id = ? FOR UPDATE', [teamId]);
    if (!teamRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Team not found' });
    }

    await conn.query('UPDATE users SET team_id = NULL WHERE team_id = ?', [teamId]);
    await conn.query(
      "UPDATE users SET role = 'participant' WHERE role = 'co-leader' AND team_id IS NULL"
    );
    await conn.query('DELETE FROM teams WHERE id = ?', [teamId]);

    await conn.commit();
    return res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    await conn.rollback();
    return next(error);
  } finally {
    conn.release();
  }
}

async function getTeamsByPerformance(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.name, t.created_at,
              l.id AS leader_id, l.name AS leader_name,
              c.id AS co_leader_id, c.name AS co_leader_name,
              (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id AND u.role = 'participant') AS participant_count,
              (SELECT COUNT(*) FROM projects p WHERE p.team_id = t.id) AS total_projects,
              (SELECT COUNT(*) FROM projects p WHERE p.team_id = t.id AND p.status = 'completed') AS completed_projects,
              (SELECT COUNT(*) FROM projects p WHERE p.team_id = t.id AND p.status = 'in-progress') AS in_progress_projects,
              ROUND(
                IFNULL(
                  ((SELECT COUNT(*) FROM projects p WHERE p.team_id = t.id AND p.status = 'completed') * 100.0) /
                  NULLIF((SELECT COUNT(*) FROM projects p WHERE p.team_id = t.id), 0),
                  0
                ),
                2
              ) AS completion_rate
       FROM teams t
       LEFT JOIN users l ON l.id = t.leader_id
       LEFT JOIN users c ON c.id = t.co_leader_id
       ORDER BY completion_rate DESC, completed_projects DESC, in_progress_projects DESC, participant_count DESC, t.created_at DESC`
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getTeamCreationRequests(req, res, next) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const q = (req.query.q || '').trim();
    const status = (req.query.status || '').trim();

    const conditions = [];
    const params = [];

    if (q) {
      conditions.push('(r.team_name LIKE ? OR l.name LIKE ? OR l.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM team_creation_requests r
       INNER JOIN users l ON l.id = r.leader_id
       ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT r.id, r.leader_id, r.team_name, r.status, r.reviewed_by, r.reviewed_at, r.created_at,
              l.name AS leader_name, l.email AS leader_email,
              a.name AS reviewed_by_name
       FROM team_creation_requests r
       INNER JOIN users l ON l.id = r.leader_id
       LEFT JOIN users a ON a.id = r.reviewed_by
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return res.json(pagedResponse(rows, countRows[0].total, page, limit));
  } catch (error) {
    return next(error);
  }
}

async function respondTeamCreationRequest(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const requestId = Number(req.params.requestId);
    const { status } = req.body;

    const [requestRows] = await conn.query(
      `SELECT r.id, r.leader_id, r.team_name, r.status,
              u.role AS leader_role, u.team_id AS leader_team_id
       FROM team_creation_requests r
       INNER JOIN users u ON u.id = r.leader_id
       WHERE r.id = ? FOR UPDATE`,
      [requestId]
    );

    if (!requestRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Team creation request not found' });
    }

    const request = requestRows[0];
    if (request.status !== 'pending') {
      await conn.rollback();
      return res.status(400).json({ message: 'Request already processed' });
    }

    if (status === 'rejected') {
      await conn.query(
        'UPDATE team_creation_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
        ['rejected', req.user.id, requestId]
      );
      await conn.commit();
      await notifyUser(
        request.leader_id,
        'Team Request Rejected',
        `Admin rejected your team creation request for "${request.team_name}"`,
        'team-request'
      );
      return res.json({ message: 'Team creation request rejected' });
    }

    if (request.leader_role !== 'leader') {
      await conn.rollback();
      return res.status(400).json({ message: 'Only leader can own a team' });
    }

    if (request.leader_team_id) {
      await conn.rollback();
      return res.status(400).json({ message: 'Leader already belongs to a team' });
    }

    const [teamResult] = await conn.query('INSERT INTO teams (name, leader_id) VALUES (?, ?)', [request.team_name, request.leader_id]);
    await conn.query('UPDATE users SET team_id = ? WHERE id = ?', [teamResult.insertId, request.leader_id]);
    await conn.query(
      'UPDATE team_creation_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      ['approved', req.user.id, requestId]
    );

    await conn.commit();
    await notifyUser(
      request.leader_id,
      'Team Request Approved',
      `Admin approved your team "${request.team_name}"`,
      'team-request'
    );
    return res.json({ message: 'Team created successfully', team_id: teamResult.insertId });
  } catch (error) {
    await conn.rollback();
    return next(error);
  } finally {
    conn.release();
  }
}

module.exports = {
  createNews,
  updateNews,
  deleteNews,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  getAllUsers,
  deleteUser,
  getAllTeams,
  deleteTeam,
  getTeamsByPerformance,
  getTeamCreationRequests,
  respondTeamCreationRequest,
  newsValidation,
  vacancyValidation,
  idValidation,
  teamRequestIdValidation,
  teamRequestResponseValidation
};
