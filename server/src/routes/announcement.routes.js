const express = require('express');
const {
  listAnnouncements,
  getAnnouncementById,
  editAnnouncement,
  sendAnnouncement
} = require('../controllers/announcement.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { authorizeEventAccess } = require('../middleware/event.middleware');

const router = express.Router({ mergeParams: true });

// All announcement routes require authentication
router.use(authenticateToken);

// List announcements
router.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'),
  authorizeEventAccess,
  listAnnouncements
);

// Get single announcement
router.get(
  '/:announcementId',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'),
  authorizeEventAccess,
  getAnnouncementById
);

// Edit / finalize announcement
router.put(
  '/:announcementId',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'),
  authorizeEventAccess,
  editAnnouncement
);

// Send confirmed announcement to Discord
router.post(
  '/:announcementId/send',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'),
  authorizeEventAccess,
  sendAnnouncement
);

module.exports = router;
