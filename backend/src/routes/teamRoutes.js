const express = require('express');
const {
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
} = require('../controllers/teamController');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/permissions');
const validate = require('../middleware/validate');
const { getTeamAuditLogs } = require('../controllers/auditController');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(auth);

router.get('/me', requirePermission(PERMISSIONS.VIEW_TEAM_DETAILS), getMyTeam);
router.get('/available-participants', requirePermission(PERMISSIONS.VIEW_AVAILABLE_PARTICIPANTS), getAvailableParticipants);
router.get('/open', requirePermission(PERMISSIONS.VIEW_OPEN_TEAMS), getOpenTeams);
router.get('/join-requests/me', requirePermission(PERMISSIONS.VIEW_OWN_JOIN_REQUESTS), getMyJoinRequests);
router.post('/join-requests', requirePermission(PERMISSIONS.REQUEST_JOIN_TEAM), joinRequestValidation, validate, createJoinRequest);
router.get('/join-requests/incoming', requirePermission(PERMISSIONS.REVIEW_JOIN_REQUESTS), getIncomingJoinRequests);
router.put('/join-requests/:requestId/respond', requirePermission(PERMISSIONS.REVIEW_JOIN_REQUESTS), joinRequestIdValidation.concat(respondJoinRequestValidation), validate, respondJoinRequest);
router.get('/team-requests/me', requirePermission(PERMISSIONS.VIEW_OWN_TEAM_REQUESTS), getMyTeamCreationRequests);
router.get('/audit-logs', requirePermission(PERMISSIONS.VIEW_TEAM_AUDIT_LOGS), getTeamAuditLogs);
router.post('/', requirePermission(PERMISSIONS.REQUEST_TEAM_CREATION), createTeamValidation, validate, createTeam);
router.put('/assign-co-leader', requirePermission(PERMISSIONS.ASSIGN_CO_LEADER), assignCoLeaderValidation, validate, assignCoLeader);
router.put('/participants', requirePermission(PERMISSIONS.REMOVE_PARTICIPANT), participantValidation, validate, addParticipant);
router.delete('/participants/:userId', requirePermission(PERMISSIONS.REMOVE_PARTICIPANT), removeParticipantValidation, validate, removeParticipant);

module.exports = router;
