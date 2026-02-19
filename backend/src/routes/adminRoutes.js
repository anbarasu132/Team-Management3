const express = require('express');
const {
  createNews,
  updateNews,
  deleteNews,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  getAllUsers,
  getAllTeams,
  getTeamsByPerformance,
  getTeamCreationRequests,
  respondTeamCreationRequest,
  newsValidation,
  vacancyValidation,
  idValidation,
  teamRequestIdValidation,
  teamRequestResponseValidation
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/permissions');
const validate = require('../middleware/validate');
const { getAdminAuditLogs } = require('../controllers/auditController');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(auth);

router.post('/news', requirePermission(PERMISSIONS.MANAGE_NEWS), newsValidation, validate, createNews);
router.put('/news/:id', requirePermission(PERMISSIONS.MANAGE_NEWS), idValidation.concat(newsValidation), validate, updateNews);
router.delete('/news/:id', requirePermission(PERMISSIONS.MANAGE_NEWS), idValidation, validate, deleteNews);

router.post('/vacancies', requirePermission(PERMISSIONS.MANAGE_VACANCIES), vacancyValidation, validate, createVacancy);
router.put('/vacancies/:id', requirePermission(PERMISSIONS.MANAGE_VACANCIES), idValidation.concat(vacancyValidation), validate, updateVacancy);
router.delete('/vacancies/:id', requirePermission(PERMISSIONS.MANAGE_VACANCIES), idValidation, validate, deleteVacancy);

router.get('/users', requirePermission(PERMISSIONS.VIEW_USERS), getAllUsers);
router.get('/teams', requirePermission(PERMISSIONS.VIEW_TEAMS), getAllTeams);
router.get('/teams/performance', requirePermission(PERMISSIONS.VIEW_TEAMS), getTeamsByPerformance);
router.get('/team-requests', requirePermission(PERMISSIONS.REVIEW_TEAM_REQUESTS), getTeamCreationRequests);
router.put(
  '/team-requests/:requestId/respond',
  requirePermission(PERMISSIONS.REVIEW_TEAM_REQUESTS),
  teamRequestIdValidation.concat(teamRequestResponseValidation),
  validate,
  respondTeamCreationRequest
);
router.get('/audit-logs', requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS), getAdminAuditLogs);

module.exports = router;
