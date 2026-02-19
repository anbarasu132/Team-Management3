const express = require('express');
const {
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
} = require('../controllers/projectController');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/permissions');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(auth);

router.post('/', requirePermission(PERMISSIONS.CREATE_PROJECT), createProjectValidation, validate, createProject);
router.post('/assign', requirePermission(PERMISSIONS.ASSIGN_PROJECT), assignProjectValidation, validate, assignProject);
router.get('/team', requirePermission(PERMISSIONS.VIEW_TEAM_PROJECTS), listTeamProjects);
router.get('/analytics/team', requirePermission(PERMISSIONS.VIEW_TEAM_ANALYTICS), getTeamAnalytics);
router.get('/assigned', requirePermission(PERMISSIONS.VIEW_ASSIGNED_PROJECTS), listAssignedProjects);
router.put('/status', requirePermission(PERMISSIONS.UPDATE_ASSIGNED_PROJECT_STATUS), participantStatusValidation, validate, updateProjectStatus);
router.get('/activity-logs', requirePermission(PERMISSIONS.VIEW_TEAM_ACTIVITY_LOGS), listActivityLogs);
router.get('/:projectId/files', requirePermission(PERMISSIONS.VIEW_PROJECT_FILES), listProjectFiles);
router.post('/:projectId/files', requirePermission(PERMISSIONS.UPLOAD_PROJECT_FILES), upload.single('file'), uploadProjectFile);

module.exports = router;
