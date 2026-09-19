const express = require('express');
const {
  createDocument,
  listDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument
} = require('../controllers/document.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { authorizeEventAccess } = require('../middleware/event.middleware');

const router = express.Router({ mergeParams: true });

// All document routes require authentication
router.use(authenticateToken);

// Document CRUD routes
router.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'),
  authorizeEventAccess,
  createDocument
);

router.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'),
  authorizeEventAccess,
  listDocuments
);

router.get(
  '/:documentId',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'),
  authorizeEventAccess,
  getDocumentById
);

router.put(
  '/:documentId',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'),
  authorizeEventAccess,
  updateDocument
);

router.delete(
  '/:documentId',
  authorizeRoles('SUPER_ADMIN', 'CLUB_ADMIN'),
  authorizeEventAccess,
  deleteDocument
);

module.exports = router;
