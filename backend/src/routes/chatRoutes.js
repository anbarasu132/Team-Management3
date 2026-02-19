const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const requirePermission = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const {
  listTeamChatMessages,
  sendTeamChatMessage,
  listTeamChatMessagesValidation,
  sendTeamChatMessageValidation
} = require('../controllers/chatController');

const router = express.Router();

router.use(auth);

router.get(
  '/team',
  requirePermission(PERMISSIONS.VIEW_TEAM_CHAT),
  listTeamChatMessagesValidation,
  validate,
  listTeamChatMessages
);

router.post(
  '/team',
  requirePermission(PERMISSIONS.SEND_TEAM_CHAT),
  sendTeamChatMessageValidation,
  validate,
  sendTeamChatMessage
);

module.exports = router;
