const express = require('express');
const {
  extractMeetingTasks,
  acceptMeetingTasks,
  queryKnowledge
} = require('../controllers/ai.controller');
const {
  generateAnnouncement
} = require('../controllers/announcement.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { authorizeEventAccess } = require('../middleware/event.middleware');

const router = express.Router();

// All AI routes require authentication
router.use(authenticateToken);

// 1. Extract task suggestions from meeting notes (Human-Review only)
router.post(
  '/events/:eventId/meeting-tasks/extract',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'),
  authorizeEventAccess,
  extractMeetingTasks
);

// 2. Accept confirmed AI task suggestions (Atomic Batch Creation)
router.post(
  '/events/:eventId/meeting-tasks/accept',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'),
  authorizeEventAccess,
  acceptMeetingTasks
);

// 3. Knowledge Query (RAG Q&A over event documents)
router.post(
  '/events/:eventId/knowledge/query',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'),
  authorizeEventAccess,
  queryKnowledge
);

// 4. AI Announcement Generation (Draft only - does not send)
router.post(
  '/events/:eventId/announcements/generate',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'),
  authorizeEventAccess,
  generateAnnouncement
);

module.exports = router;
