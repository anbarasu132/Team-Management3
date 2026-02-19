const { body, param } = require('express-validator');
const db = require('../config/db');
const { notifyUser, notifyAdmins } = require('../utils/notifications');

const createTeamValidation = [body('name').trim().notEmpty().withMessage('Team name is required')];

const assignCoLeaderValidation = [
  body('userId').isInt({ min: 1 }).withMessage('Valid userId is required')
];

const participantValidation = [
  body('userId').isInt({ min: 1 }).withMessage('Valid userId is required')
];

const removeParticipantValidation = [
  param('userId').isInt({ min: 1 }).withMessage('Valid userId is required')
];

const joinRequestValidation = [
  body('teamId').isInt({ min: 1 }).withMessage('Valid teamId is required')
];

const joinRequestIdValidation = [
  param('requestId').isInt({ min: 1 }).withMessage('Valid requestId is required')
];

const respondJoinRequestValidation = [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected')
];

async function createTeam(req, res, next) {
  try {
    const leaderId = req.user.id;
    const { name } = req.body;

    const [leaderRows] = await db.query('SELECT id, role, team_id FROM users WHERE id = ?', [leaderId]);
    if (!leaderRows.length || leaderRows[0].role !== 'leader') {
      return res.status(403).json({ message: 'Only leaders can request team creation' });
    }

    if (leaderRows[0].team_id) {
      return res.status(400).json({ message: 'Leader already belongs to a team' });
    }

    const [existingPending] = await db.query(
      'SELECT id FROM team_creation_requests WHERE leader_id = ? AND status = ? LIMIT 1',
      [leaderId, 'pending']
    );

    if (existingPending.length) {
      return res.status(400).json({ message: 'You already have a pending team creation request' });
    }

    const [result] = await db.query(
      'INSERT INTO team_creation_requests (leader_id, team_name, status) VALUES (?, ?, ?)',
      [leaderId, name, 'pending']
    );

    await notifyAdmins(
      'New Team Creation Request',
      `Leader #${leaderId} requested team "${name}"`,
      'team-request'
    );

    return res.status(201).json({
      id: result.insertId,
      leader_id: leaderId,
      team_name: name,
      status: 'pending',
      message: 'Team creation request sent to admin'
    });
  } catch (error) {
    return next(error);
  }
}

async function assignCoLeader(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const leaderId = req.user.id;
    const { userId } = req.body;

    const [leaderTeam] = await conn.query('SELECT id, leader_id, co_leader_id FROM teams WHERE leader_id = ? FOR UPDATE', [leaderId]);
    if (!leaderTeam.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Leader does not own a team' });
    }

    const team = leaderTeam[0];
    const [targetRows] = await conn.query('SELECT id, role, team_id FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!targetRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    const target = targetRows[0];
    if (target.team_id && target.team_id !== team.id) {
      await conn.rollback();
      return res.status(400).json({ message: 'User already belongs to another team' });
    }

    if (!['participant', 'co-leader'].includes(target.role)) {
      await conn.rollback();
      return res.status(400).json({ message: 'Only participant can become co-leader' });
    }

    if (team.co_leader_id && team.co_leader_id !== userId) {
      await conn.query('UPDATE users SET role = ? WHERE id = ?', ['participant', team.co_leader_id]);
    }

    await conn.query('UPDATE users SET role = ?, team_id = ? WHERE id = ?', ['co-leader', team.id, userId]);
    await conn.query('UPDATE teams SET co_leader_id = ? WHERE id = ?', [userId, team.id]);

    await conn.commit();
    return res.json({ message: 'Co-leader assigned successfully' });
  } catch (error) {
    await conn.rollback();
    return next(error);
  } finally {
    conn.release();
  }
}

async function addParticipant(req, res) {
  return res.status(400).json({
    message: 'Direct add is disabled. Participant must send join request and leader must approve.'
  });
}

async function removeParticipant(req, res, next) {
  try {
    const leaderId = req.user.id;
    const userId = Number(req.params.userId);

    const [teamRows] = await db.query('SELECT id FROM teams WHERE leader_id = ?', [leaderId]);
    if (!teamRows.length) {
      return res.status(400).json({ message: 'Team not found for leader' });
    }

    const teamId = teamRows[0].id;

    const [result] = await db.query(
      'UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ? AND role = ?',
      [userId, teamId, 'participant']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Participant not found in this team' });
    }

    return res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    return next(error);
  }
}

async function getMyTeam(req, res, next) {
  try {
    const [teamRows] = await db.query(
      `SELECT t.id, t.name, t.leader_id, t.co_leader_id, t.created_at,
              l.name AS leader_name,
              c.name AS co_leader_name
       FROM teams t
       LEFT JOIN users l ON l.id = t.leader_id
       LEFT JOIN users c ON c.id = t.co_leader_id
       WHERE t.leader_id = ? OR t.co_leader_id = ? OR t.id = ?
       LIMIT 1`,
      [req.user.id, req.user.id, req.user.team_id || 0]
    );

    if (!teamRows.length) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const team = teamRows[0];
    const [members] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE team_id = ? ORDER BY role, created_at DESC',
      [team.id]
    );

    return res.json({ ...team, members });
  } catch (error) {
    return next(error);
  }
}

async function getAvailableParticipants(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE role = 'participant' AND team_id IS NULL
       ORDER BY created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getOpenTeams(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT t.id, t.name, t.created_at,
              l.id AS leader_id, l.name AS leader_name,
              (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id AND u.role = 'participant') AS participant_count
       FROM teams t
       INNER JOIN users l ON l.id = t.leader_id
       ORDER BY t.created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function createJoinRequest(req, res, next) {
  try {
    const participantId = req.user.id;
    const { teamId } = req.body;

    const [participantRows] = await db.query('SELECT id, role, team_id FROM users WHERE id = ?', [participantId]);
    if (!participantRows.length || participantRows[0].role !== 'participant') {
      return res.status(403).json({ message: 'Only participants can request to join teams' });
    }

    if (participantRows[0].team_id) {
      return res.status(400).json({ message: 'You already belong to a team' });
    }

    const [teamRows] = await db.query('SELECT id, leader_id FROM teams WHERE id = ?', [teamId]);
    if (!teamRows.length) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const [pendingAny] = await db.query(
      'SELECT id FROM team_join_requests WHERE participant_id = ? AND status = ? LIMIT 1',
      [participantId, 'pending']
    );

    if (pendingAny.length) {
      return res.status(400).json({ message: 'You already have a pending join request' });
    }

    const [result] = await db.query(
      'INSERT INTO team_join_requests (team_id, participant_id, leader_id, status) VALUES (?, ?, ?, ?)',
      [teamId, participantId, teamRows[0].leader_id, 'pending']
    );

    await notifyUser(
      teamRows[0].leader_id,
      'New Join Request',
      `Participant #${participantId} requested to join your team`,
      'join-request'
    );

    return res.status(201).json({
      id: result.insertId,
      team_id: teamId,
      participant_id: participantId,
      leader_id: teamRows[0].leader_id,
      status: 'pending',
      message: 'Join request sent to leader'
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyJoinRequests(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.team_id, r.participant_id, r.leader_id, r.status, r.reviewed_at, r.created_at,
              t.name AS team_name,
              l.name AS leader_name
       FROM team_join_requests r
       INNER JOIN teams t ON t.id = r.team_id
       INNER JOIN users l ON l.id = r.leader_id
       WHERE r.participant_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function getIncomingJoinRequests(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.team_id, r.participant_id, r.leader_id, r.status, r.reviewed_at, r.created_at,
              t.name AS team_name,
              p.name AS participant_name,
              p.email AS participant_email
       FROM team_join_requests r
       INNER JOIN teams t ON t.id = r.team_id
       INNER JOIN users p ON p.id = r.participant_id
       WHERE r.leader_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function respondJoinRequest(req, res, next) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const leaderId = req.user.id;
    const requestId = Number(req.params.requestId);
    const { status } = req.body;

    const [requestRows] = await conn.query(
      `SELECT r.id, r.team_id, r.participant_id, r.leader_id, r.status,
              u.team_id AS participant_team_id,
              u.role AS participant_role
       FROM team_join_requests r
       INNER JOIN users u ON u.id = r.participant_id
       WHERE r.id = ? FOR UPDATE`,
      [requestId]
    );

    if (!requestRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Join request not found' });
    }

    const request = requestRows[0];
    if (request.leader_id !== leaderId) {
      await conn.rollback();
      return res.status(403).json({ message: 'Not allowed to review this request' });
    }

    if (request.status !== 'pending') {
      await conn.rollback();
      return res.status(400).json({ message: 'Request already processed' });
    }

    if (status === 'rejected') {
      await conn.query('UPDATE team_join_requests SET status = ?, reviewed_at = NOW() WHERE id = ?', ['rejected', requestId]);
      await conn.commit();
      await notifyUser(
        request.participant_id,
        'Join Request Rejected',
        'Your request to join the team was rejected by leader',
        'join-request'
      );
      return res.json({ message: 'Join request rejected' });
    }

    if (request.participant_role !== 'participant') {
      await conn.rollback();
      return res.status(400).json({ message: 'Only participant can join as participant' });
    }

    if (request.participant_team_id) {
      await conn.rollback();
      return res.status(400).json({ message: 'Participant already belongs to a team' });
    }

    const [countRows] = await conn.query(
      'SELECT COUNT(*) AS count FROM users WHERE team_id = ? AND role = ?',
      [request.team_id, 'participant']
    );

    if (countRows[0].count >= 8) {
      await conn.rollback();
      return res.status(400).json({ message: 'Participant limit reached (max 8)' });
    }

    await conn.query('UPDATE users SET team_id = ? WHERE id = ?', [request.team_id, request.participant_id]);
    await conn.query('UPDATE team_join_requests SET status = ?, reviewed_at = NOW() WHERE id = ?', ['approved', requestId]);
    await conn.query(
      'UPDATE team_join_requests SET status = ?, reviewed_at = NOW() WHERE participant_id = ? AND status = ? AND id <> ?',
      ['rejected', request.participant_id, 'pending', requestId]
    );

    await conn.commit();
    await notifyUser(
      request.participant_id,
      'Join Request Approved',
      'Your request was approved. You are now part of the team.',
      'join-request'
    );
    return res.json({ message: 'Join request approved and participant added to team' });
  } catch (error) {
    await conn.rollback();
    return next(error);
  } finally {
    conn.release();
  }
}

async function getMyTeamCreationRequests(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT id, leader_id, team_name, status, reviewed_by, reviewed_at, created_at
       FROM team_creation_requests
       WHERE leader_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTeam,
  assignCoLeader,
  addParticipant,
  removeParticipant,
  getMyTeam,
  getAvailableParticipants,
  getOpenTeams,
  createJoinRequest,
  getMyJoinRequests,
  getIncomingJoinRequests,
  respondJoinRequest,
  getMyTeamCreationRequests,
  createTeamValidation,
  assignCoLeaderValidation,
  participantValidation,
  removeParticipantValidation,
  joinRequestValidation,
  joinRequestIdValidation,
  respondJoinRequestValidation
};
