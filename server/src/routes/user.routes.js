const express = require('express');
const {
  createUser,
  listUsers,
  getUserProfileHistory
} = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

const router = express.Router();

// All user management routes require authentication
router.use(authenticateToken);

// 1. Admin User Creation (SUPER_ADMIN, CLUB_ADMIN)
router.post('/', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), createUser);

// 2. List Users with filtering (SUPER_ADMIN, CLUB_ADMIN)
router.get('/', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), listUsers);

// 3. Get 360-degree user profile history (SUPER_ADMIN, CLUB_ADMIN)
router.get('/:userId/profile', authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'), getUserProfileHistory);

module.exports = router;
