const { pool } = require('../config/database');

/**
 * List all volunteers assigned to an event
 * GET /api/events/:eventId/volunteers
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const listEventVolunteers = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT 
         v.id,
         v.user_id AS "userId",
         u.name,
         u.email,
         v.responsibility,
         v.contact,
         v.created_at AS "createdAt",
         v.updated_at AS "updatedAt"
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       WHERE v.event_id = $1
       ORDER BY v.created_at ASC`,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      data: {
        volunteers: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a volunteer to an event
 * POST /api/events/:eventId/volunteers
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const assignVolunteerToEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { userId, responsibility, contact } = req.body;
    const event = req.event; // attached by authorizeEventAccess

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    if (!responsibility || typeof responsibility !== 'string' || !responsibility.trim()) {
      return res.status(400).json({
        success: false,
        message: 'responsibility is required'
      });
    }

    // Verify user exists and is active
    const userCheck = await pool.query(
      'SELECT id, name, email, role, club_id, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const targetUser = userCheck.rows[0];

    if (!targetUser.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign a deactivated user'
      });
    }

    // SUPER_ADMIN cannot be assigned as an event volunteer
    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'SUPER_ADMIN cannot be assigned as an event volunteer'
      });
    }

    // Target user must belong to the same club as the event
    if (!targetUser.club_id || targetUser.club_id !== event.club_id) {
      return res.status(403).json({
        success: false,
        message: 'User must belong to the club hosting this event'
      });
    }

    // Check if already assigned (duplicate assignment)
    const duplicateCheck = await pool.query(
      'SELECT id FROM volunteers WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User is already assigned to this event'
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO volunteers (event_id, user_id, responsibility, contact)
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_id AS "eventId", user_id AS "userId", responsibility, contact, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [eventId, userId, responsibility.trim(), contact ? contact.trim() : null]
    );

    const assignment = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Volunteer assigned to event successfully',
      data: {
        volunteer: {
          id: assignment.id,
          eventId: assignment.eventId,
          userId: assignment.userId,
          name: targetUser.name,
          email: targetUser.email,
          responsibility: assignment.responsibility,
          contact: assignment.contact,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt
        }
      }
    });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        message: 'User is already assigned to this event'
      });
    }
    next(error);
  }
};

/**
 * Update volunteer responsibility or contact on an event
 * PUT /api/events/:eventId/volunteers/:volunteerId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const updateEventVolunteer = async (req, res, next) => {
  try {
    const { eventId, volunteerId } = req.params;
    const { responsibility, contact } = req.body;

    // Verify assignment exists and belongs to this event
    const assignmentCheck = await pool.query(
      `SELECT v.id, v.user_id, v.responsibility, v.contact, u.name, u.email
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       WHERE v.id = $1 AND v.event_id = $2`,
      [volunteerId, eventId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer assignment not found for this event'
      });
    }

    const current = assignmentCheck.rows[0];

    if (responsibility !== undefined && (typeof responsibility !== 'string' || !responsibility.trim())) {
      return res.status(400).json({
        success: false,
        message: 'responsibility cannot be empty'
      });
    }

    const updatedResponsibility = responsibility !== undefined ? responsibility.trim() : current.responsibility;
    const updatedContact = contact !== undefined ? (contact ? contact.trim() : null) : current.contact;

    const updateResult = await pool.query(
      `UPDATE volunteers
       SET responsibility = $1, contact = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND event_id = $4
       RETURNING id, event_id AS "eventId", user_id AS "userId", responsibility, contact, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [updatedResponsibility, updatedContact, volunteerId, eventId]
    );

    const updated = updateResult.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Volunteer assignment updated successfully',
      data: {
        volunteer: {
          id: updated.id,
          eventId: updated.eventId,
          userId: updated.userId,
          name: current.name,
          email: current.email,
          responsibility: updated.responsibility,
          contact: updated.contact,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove volunteer from event
 * DELETE /api/events/:eventId/volunteers/:volunteerId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const removeVolunteerFromEvent = async (req, res, next) => {
  try {
    const { eventId, volunteerId } = req.params;

    const result = await pool.query(
      'DELETE FROM volunteers WHERE id = $1 AND event_id = $2 RETURNING id, user_id',
      [volunteerId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer assignment not found for this event'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Volunteer removed from event successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user's assignment for an event
 * GET /api/events/:eventId/my-assignment
 * Access: Authenticated User
 */
const getMyEventAssignment = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.user;

    const result = await pool.query(
      `SELECT 
         v.id,
         v.event_id AS "eventId",
         v.user_id AS "userId",
         u.name,
         u.email,
         v.responsibility,
         v.contact,
         v.created_at AS "createdAt",
         v.updated_at AS "updatedAt"
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       WHERE v.event_id = $1 AND v.user_id = $2`,
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No assignment found for the authenticated user in this event'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        assignment: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listEventVolunteers,
  assignVolunteerToEvent,
  updateEventVolunteer,
  removeVolunteerFromEvent,
  getMyEventAssignment
};
