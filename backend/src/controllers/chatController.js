const { body, query } = require('express-validator');
const db = require('../config/db');

const listTeamChatMessagesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid page size')
];

const sendTeamChatMessageValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 2000 })
    .withMessage('Message must be at most 2000 characters')
];

function getTeamIdFromUser(req) {
  const teamId = Number(req.user?.team_id || 0);
  return teamId > 0 ? teamId : null;
}

async function listTeamChatMessages(req, res, next) {
  try {
    const teamId = getTeamIdFromUser(req);
    if (!teamId) {
      return res.status(400).json({ message: 'You are not part of any team' });
    }

    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);
    const offset = (page - 1) * pageSize;

    const [countRows] = await db.query(
      'SELECT COUNT(*) AS total FROM team_chat_messages WHERE team_id = ?',
      [teamId]
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const [rows] = await db.query(
      `SELECT m.id, m.team_id, m.sender_id, u.name AS sender_name, u.role AS sender_role, m.message, m.created_at
       FROM team_chat_messages m
       INNER JOIN users u ON u.id = m.sender_id
       WHERE m.team_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [teamId, pageSize, offset]
    );

    return res.json({
      messages: rows.reverse(),
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function sendTeamChatMessage(req, res, next) {
  try {
    const teamId = getTeamIdFromUser(req);
    if (!teamId) {
      return res.status(400).json({ message: 'You are not part of any team' });
    }

    const message = String(req.body.message || '').trim();
    const [result] = await db.query(
      'INSERT INTO team_chat_messages (team_id, sender_id, message) VALUES (?, ?, ?)',
      [teamId, req.user.id, message]
    );

    return res.status(201).json({
      message: 'Message sent',
      chatMessageId: result.insertId
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTeamChatMessages,
  sendTeamChatMessage,
  listTeamChatMessagesValidation,
  sendTeamChatMessageValidation
};
