const express = require('express');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  cancelEvent
} = require('../controllers/event.controller');
const {
  listEventVolunteers,
  assignVolunteerToEvent,
  updateEventVolunteer,
  removeVolunteerFromEvent,
  getMyEventAssignment
} = require('../controllers/eventVolunteer.controller');
const {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask
} = require('../controllers/task.controller');
const {
  runRiskDetection,
  listEventRisks,
  getRiskById,
  resolveRisk,
  reopenRisk,
  explainRiskHandler
} = require('../controllers/risk.controller');
const {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument
} = require('../controllers/document.controller');
const {
  listAnnouncements,
  getAnnouncementById,
  editAnnouncement,
  sendAnnouncement
} = require('../controllers/announcement.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { authorizeEventAccess } = require('../middleware/event.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==========================================
// 1. Core Event Routes
// ==========================================
router.post('/', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), createEvent);
router.get('/', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), getEvents);
router.get('/:eventId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, getEventById);
router.put('/:eventId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, updateEvent);
router.patch('/:eventId/status', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, updateEventStatus);
router.patch('/:eventId/cancel', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, cancelEvent);

// ==========================================
// 2. Event Volunteers
// ==========================================
router.get('/:eventId/volunteers', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, listEventVolunteers);
router.post('/:eventId/volunteers', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, assignVolunteerToEvent);
router.put('/:eventId/volunteers/:volunteerId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, updateEventVolunteer);
router.delete('/:eventId/volunteers/:volunteerId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, removeVolunteerFromEvent);
router.get('/:eventId/my-assignment', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, getMyEventAssignment);

// ==========================================
// 3. Event Tasks
// ==========================================
router.get('/:eventId/tasks', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, listTasks);
router.post('/:eventId/tasks', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, createTask);
router.get('/:eventId/tasks/:taskId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, getTaskById);
router.put('/:eventId/tasks/:taskId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, updateTask);
router.patch('/:eventId/tasks/:taskId/status', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, updateTaskStatus);
router.delete('/:eventId/tasks/:taskId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, deleteTask);

// ==========================================
// 4. Event Risks
// ==========================================
router.post('/:eventId/risks/detect', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, runRiskDetection);
router.get('/:eventId/risks', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, listEventRisks);
router.get('/:eventId/risks/:riskId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, getRiskById);
router.patch('/:eventId/risks/:riskId/resolve', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, resolveRisk);
router.patch('/:eventId/risks/:riskId/reopen', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, reopenRisk);
router.post('/:eventId/risks/:riskId/explain', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, explainRiskHandler);

// ==========================================
// 5. Event Documents (Knowledge Base)
// ==========================================
router.post('/:eventId/documents', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, createDocument);
router.get('/:eventId/documents', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, listDocuments);
router.get('/:eventId/documents/:documentId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, getDocumentById);
router.put('/:eventId/documents/:documentId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, updateDocument);
router.delete('/:eventId/documents/:documentId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, deleteDocument);

// ==========================================
// 6. Event Announcements
// ==========================================
router.get('/:eventId/announcements', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, listAnnouncements);
router.get('/:eventId/announcements/:announcementId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeEventAccess, getAnnouncementById);
router.put('/:eventId/announcements/:announcementId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, editAnnouncement);
router.post('/:eventId/announcements/:announcementId/send', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeEventAccess, sendAnnouncement);

module.exports = router;
