const { body, param, query } = require('express-validator');
const db = require('../config/db');

const notificationIdValidation = [param('id').isInt({ min: 1 }).withMessage('Invalid notification id')];
const bulkNotificationIdsValidation = [
  body('notificationIds').isArray({ min: 1 }).withMessage('notificationIds must be a non-empty array'),
  body('notificationIds.*').isInt({ min: 1 }).withMessage('Invalid notification id in notificationIds')
];
const getNotificationsValidation = [
  query('status').optional().isIn(['all', 'unread', 'read']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid page size')
];

async function getMyNotifications(req, res, next) {
  try {
    const status = req.query.status || 'all';
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const offset = (page - 1) * pageSize;

    let statusFilter = '';
    if (status === 'unread') statusFilter = ' AND is_read = 0';
    if (status === 'read') statusFilter = ' AND is_read = 1';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM notifications
       WHERE user_id = ?${statusFilter}`,
      [req.user.id]
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const [rows] = await db.query(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = ?${statusFilter}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, pageSize, offset]
    );

    const [unreadRows] = await db.query(
      `SELECT COUNT(*) AS unreadCount
       FROM notifications
       WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );

    const unreadCount = Number(unreadRows[0]?.unreadCount || 0);
    return res.json({
      unreadCount,
      notifications: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        status
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const notificationId = Number(req.params.id);
    const [result] = await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.user.id]);
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return next(error);
  }
}

async function markSelectedNotificationsRead(req, res, next) {
  try {
    const notificationIds = [...new Set(req.body.notificationIds.map(Number))];
    const placeholders = notificationIds.map(() => '?').join(', ');
    const [result] = await db.query(
      `UPDATE notifications
       SET is_read = 1
       WHERE user_id = ?
       AND id IN (${placeholders})`,
      [req.user.id, ...notificationIds]
    );

    return res.json({
      message: 'Selected notifications marked as read',
      affectedRows: result.affectedRows || 0
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteSelectedNotifications(req, res, next) {
  try {
    const notificationIds = [...new Set(req.body.notificationIds.map(Number))];
    const placeholders = notificationIds.map(() => '?').join(', ');
    const [result] = await db.query(
      `DELETE FROM notifications
       WHERE user_id = ?
       AND id IN (${placeholders})`,
      [req.user.id, ...notificationIds]
    );

    return res.json({
      message: 'Selected notifications deleted',
      affectedRows: result.affectedRows || 0
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markSelectedNotificationsRead,
  deleteSelectedNotifications,
  notificationIdValidation,
  bulkNotificationIdsValidation,
  getNotificationsValidation
};
