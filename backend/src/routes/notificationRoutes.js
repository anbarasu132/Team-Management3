const express = require('express');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/permissions');
const validate = require('../middleware/validate');
const { PERMISSIONS } = require('../config/permissions');
const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markSelectedNotificationsRead,
  deleteSelectedNotifications,
  notificationIdValidation,
  bulkNotificationIdsValidation,
  getNotificationsValidation
} = require('../controllers/notificationController');

const router = express.Router();

router.use(auth);

router.get('/', requirePermission(PERMISSIONS.VIEW_NOTIFICATIONS), getNotificationsValidation, validate, getMyNotifications);
router.put('/read-all', requirePermission(PERMISSIONS.MANAGE_NOTIFICATIONS), markAllNotificationsRead);
router.put('/bulk-read', requirePermission(PERMISSIONS.MANAGE_NOTIFICATIONS), bulkNotificationIdsValidation, validate, markSelectedNotificationsRead);
router.delete('/bulk-delete', requirePermission(PERMISSIONS.MANAGE_NOTIFICATIONS), bulkNotificationIdsValidation, validate, deleteSelectedNotifications);
router.put('/:id/read', requirePermission(PERMISSIONS.MANAGE_NOTIFICATIONS), notificationIdValidation, validate, markNotificationRead);

module.exports = router;
