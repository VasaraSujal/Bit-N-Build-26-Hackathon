const { pool } = require('../config/database');

const ALLOWED_STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'];

/**
 * Create a new event
 * POST /api/events
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const createEvent = async (req, res, next) => {
  try {
    const { clubId, name, description, eventDate } = req.body;
    const { role, clubId: userClubId } = req.user;

    // Validate clubId
    if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'clubId is required'
      });
    }

    // CLUB_ADMIN can only create events for their assigned club
    if (role === 'CLUB_ADMIN' && userClubId !== clubId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only create events for your assigned club.'
      });
    }

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required'
      });
    }

    // Validate eventDate
    if (!eventDate || isNaN(Date.parse(eventDate))) {
      return res.status(400).json({
        success: false,
        message: 'A valid eventDate is required'
      });
    }

    // Verify club exists and is active
    const clubCheck = await pool.query(
      'SELECT id, is_active FROM clubs WHERE id = $1',
      [clubId]
    );

    if (clubCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    if (!clubCheck.rows[0].is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create events for an inactive club'
      });
    }

    const result = await pool.query(
      `INSERT INTO events (club_id, name, description, event_date, status)
       VALUES ($1, $2, $3, $4, 'upcoming')
       RETURNING id, club_id AS "clubId", name, description, event_date AS "eventDate", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [clubId, name.trim(), description ? description.trim() : null, new Date(eventDate)]
    );

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        event: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all events accessible to user
 * GET /api/events
 * Access: SUPER_ADMIN (all or ?clubId), CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const getEvents = async (req, res, next) => {
  try {
    const { role, clubId: userClubId } = req.user;
    const { clubId: queryClubId } = req.query;

    let queryText = `
      SELECT id, club_id AS "clubId", name, description, event_date AS "eventDate", status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM events
    `;
    const queryParams = [];

    if (role === 'SUPER_ADMIN') {
      if (queryClubId) {
        queryText += ' WHERE club_id = $1';
        queryParams.push(queryClubId);
      }
    } else {
      // CLUB_ADMIN & VOLUNTEER are strictly locked to their own club
      if (!userClubId) {
        return res.status(200).json({
          success: true,
          data: {
            events: []
          }
        });
      }
      queryText += ' WHERE club_id = $1';
      queryParams.push(userClubId);
    }

    queryText += ' ORDER BY event_date ASC';

    const result = await pool.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      data: {
        events: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event by ID
 * GET /api/events/:eventId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const getEventById = async (req, res, next) => {
  try {
    // req.event is populated by authorizeEventAccess middleware
    return res.status(200).json({
      success: true,
      data: {
        event: {
          id: req.event.id,
          clubId: req.event.club_id,
          name: req.event.name,
          description: req.event.description,
          eventDate: req.event.eventDate,
          status: req.event.status,
          createdAt: req.event.createdAt,
          updatedAt: req.event.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event details
 * PUT /api/events/:eventId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const updateEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { name, description, eventDate } = req.body;

    // Validate inputs if provided
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Event name cannot be empty'
      });
    }

    if (eventDate !== undefined && (isNaN(Date.parse(eventDate)))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid eventDate provided'
      });
    }

    const updatedName = name !== undefined ? name.trim() : req.event.name;
    const updatedDescription = description !== undefined ? (description ? description.trim() : null) : req.event.description;
    const updatedEventDate = eventDate !== undefined ? new Date(eventDate) : req.event.eventDate;

    const result = await pool.query(
      `UPDATE events
       SET name = $1, description = $2, event_date = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, club_id AS "clubId", name, description, event_date AS "eventDate", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [updatedName, updatedDescription, updatedEventDate, eventId]
    );

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: {
        event: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event status
 * PATCH /api/events/:eventId/status
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const updateEventStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`
      });
    }

    const result = await pool.query(
      `UPDATE events
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, club_id AS "clubId", name, description, event_date AS "eventDate", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [status, eventId]
    );

    return res.status(200).json({
      success: true,
      message: 'Event status updated successfully',
      data: {
        event: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an event (Soft-cancel by setting status = 'cancelled')
 * PATCH /api/events/:eventId/cancel
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const cancelEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `UPDATE events
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, club_id AS "clubId", name, description, event_date AS "eventDate", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      message: 'Event cancelled successfully',
      data: {
        event: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all events for a specific club
 * GET /api/clubs/:clubId/events
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const getClubEvents = async (req, res, next) => {
  try {
    const { clubId } = req.params;

    // Verify club exists
    const clubCheck = await pool.query(
      'SELECT id FROM clubs WHERE id = $1',
      [clubId]
    );

    if (clubCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    const result = await pool.query(
      `SELECT id, club_id AS "clubId", name, description, event_date AS "eventDate", status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM events
       WHERE club_id = $1
       ORDER BY event_date ASC`,
      [clubId]
    );

    return res.status(200).json({
      success: true,
      data: {
        events: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  cancelEvent,
  getClubEvents
};
