const { verifyToken } = require('../utils/auth');

/**
 * Middleware to authenticate requests via JWT Bearer token in the Authorization header.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authorization header missing.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token format. Expected: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      clubId: decoded.clubId || null
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid or expired token.'
    });
  }
};

module.exports = {
  authenticateToken
};
