/**
 * Middleware to authorize club-level access.
 * - SUPER_ADMIN: permitted for any club.
 * - CLUB_ADMIN & VOLUNTEER: permitted only if req.params.clubId matches req.user.clubId.
 */
const authorizeClubAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Authentication required.'
    });
  }

  const { role, clubId: userClubId } = req.user;
  const requestedClubId = req.params.clubId;

  // Super Admin can access any club
  if (role === 'SUPER_ADMIN') {
    return next();
  }

  // Club Admin and Volunteer can only access their assigned club
  if (userClubId && userClubId === requestedClubId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden. You do not have permission to access another club.'
  });
};

module.exports = {
  authorizeClubAccess
};
