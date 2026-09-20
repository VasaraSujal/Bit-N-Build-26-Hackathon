const express = require('express');
const {
  createClub,
  getClubs,
  getClubById,
  updateClub,
  deactivateClub,
  activateClub,
  getClubMembers,
  getClubSummary
} = require('../controllers/club.controller');
const {
  assignOrReplaceClubAdmin,
  assignVolunteerToClub,
  removeVolunteerFromClub
} = require('../controllers/clubAdmin.controller');
const { getClubEvents } = require('../controllers/event.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { authorizeClubAccess } = require('../middleware/club.middleware');
const { uploadClubLogoMiddleware } = require('../middleware/upload.middleware');

const router = express.Router();

// All routes in this file require authentication
router.use(authenticateToken);

// ==========================================
// 1. Club Management (SUPER_ADMIN only)
// ==========================================
router.post('/', authorizeRoles('SUPER_ADMIN'), uploadClubLogoMiddleware, createClub);
router.get('/', authorizeRoles('SUPER_ADMIN'), getClubs);
router.put('/:clubId', authorizeRoles('SUPER_ADMIN'), uploadClubLogoMiddleware, updateClub);
router.patch('/:clubId/activate', authorizeRoles('SUPER_ADMIN'), activateClub);
router.patch('/:clubId/deactivate', authorizeRoles('SUPER_ADMIN'), deactivateClub);

// ==========================================
// 2. Club Admin & Volunteer Management (SUPER_ADMIN only)
// ==========================================
router.patch('/:clubId/admin', authorizeRoles('SUPER_ADMIN'), assignOrReplaceClubAdmin);
router.patch('/:clubId/volunteers/:userId', authorizeRoles('SUPER_ADMIN'), assignVolunteerToClub);
router.delete('/:clubId/volunteers/:userId', authorizeRoles('SUPER_ADMIN'), removeVolunteerFromClub);

// ==========================================
// 3. Club Access (SUPER_ADMIN or assigned CLUB_ADMIN)
// ==========================================
router.get('/:clubId', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeClubAccess, getClubById);
router.get('/:clubId/members', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeClubAccess, getClubMembers);
router.get('/:clubId/summary', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), authorizeClubAccess, getClubSummary);
router.get('/:clubId/events', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'), authorizeClubAccess, getClubEvents);

module.exports = router;
