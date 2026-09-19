const { pool } = require('../config/database');

/**
 * Middleware to fetch event by ID and authorize access based on actual club_id.
 * Attaches the fetched event to req.event.
 */
const authorizeEventAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Authentication required.'
    });
  }

  const { eventId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, club_id, name, description, event_date AS "eventDate", status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM events 
       WHERE id = $1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = result.rows[0];
    const { role, clubId: userClubId } = req.user;

    // Super Admin can access any event
    if (role === 'SUPER_ADMIN') {
      req.event = event;
      return next();
    }

    // Club Admin & Volunteer can only access events from their own club
    if (userClubId && userClubId === event.club_id) {
      req.event = event;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden. You do not have permission to access events from another club.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authorizeEventAccess
};
