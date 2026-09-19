/**
 * Middleware to restrict access based on user roles.
 * @param  {...string} allowedRoles - e.g. 'SUPER_ADMIN', 'CLUB_ADMIN', 'VOLUNTEER'
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access this resource.'
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles
};
