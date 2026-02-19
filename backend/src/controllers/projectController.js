const { body } = require('express-validator');
const db = require('../config/db');
const { notifyUser } = require('../utils/notifications');
const { getPaginationParams, pagedResponse } = require('../utils/pagination');

const createProjectValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('status').optional().isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status'),
  body('deadline').isISO8601().withMessage('Valid deadline is required')
];

const assignProjectValidation = [
  body('projectId').isInt({ min: 1 }).withMessage('Valid projectId is required'),
  body('userId').isInt({ min: 1 }).withMessage('Valid userId is required')
];

const participantStatusValidation = [
  body('projectId').isInt({ min: 1 }).withMessage('Valid projectId is required'),
  body('status').isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status')
];

async function createProject(req, res, next) {
  try {
    const [teamRows] = await db.query('SELECT id FROM teams WHERE leader_id = ?', [req.user.id]);
    if (!teamRows.length) {
      return res.status(400).json({ message: 'Team not found for leader' });
    }

    const teamId = teamRows[0].id;
    const { title, description, status = 'pending', deadline } = req.body;

    const [result] = await db.query(
      'INSERT INTO projects (team_id, title, description, status, deadline) VALUES (?, ?, ?, ?, ?)',
      [teamId, title, description, status, deadline]
    );

    return res.status(201).json({ id: result.insertId, team_id: teamId, title, description, status, deadline });
  } catch (error) {
    return next(error);
  }
}

async function assignProject(req, res, next) {
  try {
    const { projectId, userId } = req.body;
    const [teamRows] = await db.query('SELECT id FROM teams WHERE leader_id = ?', [req.user.id]);
    if (!teamRows.length) {
      return res.status(400).json({ message: 'Team not found for leader' });
    }

    const teamId = teamRows[0].id;

    const [projectRows] = await db.query('SELECT id FROM projects WHERE id = ? AND team_id = ?', [projectId, teamId]);
    if (!projectRows.length) {
      return res.status(404).json({ message: 'Project not found in your team' });
    }

    const [userRows] = await db.query(
      'SELECT id, role FROM users WHERE id = ? AND team_id = ? AND role IN (?, ?, ?)',
      [userId, teamId, 'participant', 'co-leader', 'leader']
    );

    if (!userRows.length) {
      return res.status(404).json({ message: 'User not found in your team' });
    }

    await db.query('INSERT IGNORE INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projectId, userId]);
    await db.query('INSERT INTO activity_logs (user_id, project_id, action) VALUES (?, ?, ?)', [
      req.user.id,
      projectId,
      `Assigned project to user ${userId}`
    ]);
    await notifyUser(
      userId,
      'New Project Assigned',
      `You have been assigned to project #${projectId}`,
      'project'
    );

    return res.json({ message: 'Project assigned successfully' });
  } catch (error) {
    return next(error);
  }
}

async function listTeamProjects(req, res, next) {
  try {
    const teamId = req.user.team_id;
    if (!teamId) {
      return res.json(pagedResponse([], 0, 1, 10));
    }

    const { page, limit, offset } = getPaginationParams(req.query);
    const q = (req.query.q || '').trim();
    const status = (req.query.status || '').trim();

    const conditions = ['p.team_id = ?'];
    const params = [teamId];

    if (q) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM projects p
       ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT p.*, 
              (SELECT COUNT(*) FROM project_assignments pa WHERE pa.project_id = p.id) AS assigned_count
       FROM projects p
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json(pagedResponse(rows, countRows[0].total, page, limit));
  } catch (error) {
    return next(error);
  }
}

async function listAssignedProjects(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.team_id, p.title, p.description, p.status, p.deadline, p.created_at
       FROM projects p
       INNER JOIN project_assignments pa ON pa.project_id = p.id
       WHERE pa.user_id = ?
       ORDER BY p.deadline ASC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function updateProjectStatus(req, res, next) {
  try {
    const { projectId, status } = req.body;

    const [assigned] = await db.query(
      'SELECT project_id FROM project_assignments WHERE project_id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (!assigned.length) {
      return res.status(403).json({ message: 'You are not assigned to this project' });
    }

    await db.query('UPDATE projects SET status = ? WHERE id = ?', [status, projectId]);
    await db.query('INSERT INTO activity_logs (user_id, project_id, action) VALUES (?, ?, ?)', [
      req.user.id,
      projectId,
      `Updated status to ${status}`
    ]);

    return res.json({ message: 'Project status updated' });
  } catch (error) {
    return next(error);
  }
}

async function listActivityLogs(req, res, next) {
  try {
    const [teamRows] = await db.query('SELECT id FROM teams WHERE leader_id = ?', [req.user.id]);
    if (!teamRows.length) {
      return res.status(400).json({ message: 'Team not found for leader' });
    }

    const { page, limit, offset } = getPaginationParams(req.query);
    const q = (req.query.q || '').trim();

    const conditions = ['p.team_id = ?'];
    const params = [teamRows[0].id];

    if (q) {
      conditions.push('(a.action LIKE ? OR u.name LIKE ? OR p.title LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN projects p ON p.id = a.project_id
       ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT a.id, a.action, a.created_at, u.name AS actor_name, p.title AS project_title
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN projects p ON p.id = a.project_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json(pagedResponse(rows, countRows[0].total, page, limit));
  } catch (error) {
    return next(error);
  }
}

async function getTeamAnalytics(req, res, next) {
  try {
    const teamId = req.user.team_id;
    if (!teamId) {
      return res.json({
        summary: {
          total_projects: 0,
          pending_projects: 0,
          in_progress_projects: 0,
          completed_projects: 0,
          overdue_projects: 0,
          upcoming_7_days: 0,
          completion_rate: 0,
          avg_completed_per_week_last_4_weeks: 0
        },
        weekly_trend: [],
        member_performance: []
      });
    }

    const [summaryRows] = await db.query(
      `SELECT
          COUNT(*) AS total_projects,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_projects,
          SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) AS in_progress_projects,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_projects,
          SUM(CASE WHEN deadline < CURDATE() AND status <> 'completed' THEN 1 ELSE 0 END) AS overdue_projects,
          SUM(CASE WHEN deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status <> 'completed' THEN 1 ELSE 0 END) AS upcoming_7_days
       FROM projects
       WHERE team_id = ?`,
      [teamId]
    );

    const summary = summaryRows[0] || {};
    const totalProjects = Number(summary.total_projects || 0);
    const completedProjects = Number(summary.completed_projects || 0);
    summary.completion_rate = totalProjects === 0 ? 0 : Number(((completedProjects * 100) / totalProjects).toFixed(2));

    const [completionEvents] = await db.query(
      `SELECT DATE(a.created_at) AS event_date, COUNT(*) AS completed_count
       FROM activity_logs a
       INNER JOIN projects p ON p.id = a.project_id
       WHERE p.team_id = ?
         AND a.action = 'Updated status to completed'
         AND a.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 WEEK)
       GROUP BY DATE(a.created_at)
       ORDER BY event_date ASC`,
      [teamId]
    );

    const [createdEvents] = await db.query(
      `SELECT DATE(created_at) AS event_date, COUNT(*) AS created_count
       FROM projects
       WHERE team_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 WEEK)
       GROUP BY DATE(created_at)
       ORDER BY event_date ASC`,
      [teamId]
    );

    const completionMap = new Map(completionEvents.map((r) => [String(r.event_date), Number(r.completed_count)]));
    const createdMap = new Map(createdEvents.map((r) => [String(r.event_date), Number(r.created_count)]));

    const weeklyTrend = [];
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (start.getDay() || 7) + 1 - (i * 7));
      const weekDates = [];
      for (let j = 0; j < 7; j += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + j);
        weekDates.push(d.toISOString().slice(0, 10));
      }
      const completedInWeek = weekDates.reduce((acc, d) => acc + (completionMap.get(d) || 0), 0);
      const createdInWeek = weekDates.reduce((acc, d) => acc + (createdMap.get(d) || 0), 0);
      weeklyTrend.push({
        week_start: weekDates[0],
        created: createdInWeek,
        completed: completedInWeek
      });
    }

    const last4 = weeklyTrend.slice(-4);
    const totalCompletedLast4 = last4.reduce((acc, w) => acc + w.completed, 0);
    summary.avg_completed_per_week_last_4_weeks = Number((totalCompletedLast4 / 4).toFixed(2));

    const [memberRows] = await db.query(
      `SELECT u.id, u.name, u.role,
              COUNT(pa.project_id) AS assigned_projects,
              SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed_projects
       FROM users u
       LEFT JOIN project_assignments pa ON pa.user_id = u.id
       LEFT JOIN projects p ON p.id = pa.project_id AND p.team_id = ?
       WHERE u.team_id = ?
       GROUP BY u.id, u.name, u.role
       ORDER BY completed_projects DESC, assigned_projects DESC, u.name ASC`,
      [teamId, teamId]
    );

    const memberPerformance = memberRows.map((m) => {
      const assigned = Number(m.assigned_projects || 0);
      const completed = Number(m.completed_projects || 0);
      return {
        id: m.id,
        name: m.name,
        role: m.role,
        assigned_projects: assigned,
        completed_projects: completed,
        completion_rate: assigned === 0 ? 0 : Number(((completed * 100) / assigned).toFixed(2))
      };
    });

    return res.json({
      summary,
      weekly_trend: weeklyTrend,
      member_performance: memberPerformance
    });
  } catch (error) {
    return next(error);
  }
}

async function listProjectFiles(req, res, next) {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }

    const [projectRows] = await db.query('SELECT id, team_id FROM projects WHERE id = ?', [projectId]);
    if (!projectRows.length) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectRows[0];

    if (req.user.role === 'participant') {
      const [assigned] = await db.query(
        'SELECT project_id FROM project_assignments WHERE project_id = ? AND user_id = ?',
        [projectId, req.user.id]
      );
      if (!assigned.length) {
        return res.status(403).json({ message: 'You are not assigned to this project' });
      }
    } else {
      if (!req.user.team_id || req.user.team_id !== project.team_id) {
        return res.status(403).json({ message: 'Project not in your team' });
      }
    }

    const [rows] = await db.query(
      `SELECT f.id, f.project_id, f.uploaded_by, f.original_name, f.stored_name, f.file_path, f.mime_type, f.file_size, f.created_at,
              u.name AS uploaded_by_name
       FROM project_files f
       LEFT JOIN users u ON u.id = f.uploaded_by
       WHERE f.project_id = ?
       ORDER BY f.created_at DESC`,
      [projectId]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function uploadProjectFile(req, res, next) {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) {
      return res.status(400).json({ message: 'Invalid projectId' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const [projectRows] = await db.query('SELECT id, team_id FROM projects WHERE id = ?', [projectId]);
    if (!projectRows.length) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectRows[0];

    if (req.user.role === 'participant') {
      const [assigned] = await db.query(
        'SELECT project_id FROM project_assignments WHERE project_id = ? AND user_id = ?',
        [projectId, req.user.id]
      );
      if (!assigned.length) {
        return res.status(403).json({ message: 'You are not assigned to this project' });
      }
    } else {
      if (!req.user.team_id || req.user.team_id !== project.team_id) {
        return res.status(403).json({ message: 'Project not in your team' });
      }
    }

    const [result] = await db.query(
      `INSERT INTO project_files
       (project_id, uploaded_by, original_name, stored_name, file_path, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        req.user.id,
        req.file.originalname,
        req.file.filename,
        `/uploads/${req.file.filename}`,
        req.file.mimetype,
        req.file.size
      ]
    );

    return res.status(201).json({
      id: result.insertId,
      project_id: projectId,
      original_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      mime_type: req.file.mimetype,
      file_size: req.file.size
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createProject,
  assignProject,
  listTeamProjects,
  listAssignedProjects,
  updateProjectStatus,
  listActivityLogs,
  getTeamAnalytics,
  listProjectFiles,
  uploadProjectFile,
  createProjectValidation,
  assignProjectValidation,
  participantStatusValidation
};
