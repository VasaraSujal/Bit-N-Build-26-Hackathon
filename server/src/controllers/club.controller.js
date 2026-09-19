const { pool } = require('../config/database');

/**
 * Create a new club
 * POST /api/clubs
 * Access: SUPER_ADMIN
 */
const createClub = async (req, res, next) => {
  try {
    const { name, description, logoUrl } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Club name is required'
      });
    }

    const trimmedName = name.trim();

    // Check duplicate club name
    const existing = await pool.query(
      'SELECT id FROM clubs WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A club with this name already exists'
      });
    }

    const result = await pool.query(
      `INSERT INTO clubs (name, description, logo_url, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, name, description, logo_url AS "logoUrl", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [trimmedName, description ? description.trim() : null, logoUrl ? logoUrl.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: 'Club created successfully',
      data: {
        club: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all clubs
 * GET /api/clubs
 * Access: SUPER_ADMIN
 */
const getClubs = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, logo_url AS "logoUrl", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM clubs
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      data: {
        clubs: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get club by ID
 * GET /api/clubs/:clubId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const getClubById = async (req, res, next) => {
  try {
    const { clubId } = req.params;

    const result = await pool.query(
      `SELECT id, name, description, logo_url AS "logoUrl", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM clubs
       WHERE id = $1`,
      [clubId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        club: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update club details
 * PUT /api/clubs/:clubId
 * Access: SUPER_ADMIN
 */
const updateClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { name, description, logoUrl } = req.body;

    // Check if club exists
    const clubCheck = await pool.query(
      'SELECT id, name, description, logo_url FROM clubs WHERE id = $1',
      [clubId]
    );

    if (clubCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    let updatedName = clubCheck.rows[0].name;
    if (name && typeof name === 'string' && name.trim()) {
      const trimmedName = name.trim();
      // Check duplicate name on another club
      const duplicateCheck = await pool.query(
        'SELECT id FROM clubs WHERE LOWER(name) = LOWER($1) AND id != $2',
        [trimmedName, clubId]
      );
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Another club with this name already exists'
        });
      }
      updatedName = trimmedName;
    }

    const updatedDescription = description !== undefined ? (description ? description.trim() : null) : clubCheck.rows[0].description;
    const updatedLogoUrl = logoUrl !== undefined ? (logoUrl ? logoUrl.trim() : null) : clubCheck.rows[0].logo_url;

    const result = await pool.query(
      `UPDATE clubs
       SET name = $1, description = $2, logo_url = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, description, logo_url AS "logoUrl", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [updatedName, updatedDescription, updatedLogoUrl, clubId]
    );

    return res.status(200).json({
      success: true,
      message: 'Club updated successfully',
      data: {
        club: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate a club
 * PATCH /api/clubs/:clubId/deactivate
 * Access: SUPER_ADMIN
 */
const deactivateClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;

    const result = await pool.query(
      `UPDATE clubs
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, is_active AS "isActive", updated_at AS "updatedAt"`,
      [clubId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Club deactivated successfully',
      data: {
        club: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate a club
 * PATCH /api/clubs/:clubId/activate
 * Access: SUPER_ADMIN
 */
const activateClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;

    const result = await pool.query(
      `UPDATE clubs
       SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, is_active AS "isActive", updated_at AS "updatedAt"`,
      [clubId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Club activated successfully',
      data: {
        club: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all members belonging to a club
 * GET /api/clubs/:clubId/members
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const getClubMembers = async (req, res, next) => {
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

    const membersResult = await pool.query(
      `SELECT id, name, email, role, is_active AS "isActive", created_at AS "createdAt"
       FROM users
       WHERE club_id = $1
       ORDER BY role ASC, name ASC`,
      [clubId]
    );

    return res.status(200).json({
      success: true,
      data: {
        members: membersResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get basic club summary / stats
 * GET /api/clubs/:clubId/summary
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const getClubSummary = async (req, res, next) => {
  try {
    const { clubId } = req.params;

    const clubResult = await pool.query(
      `SELECT id, name, description, is_active AS "isActive"
       FROM clubs
       WHERE id = $1`,
      [clubId]
    );

    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    const countsResult = await pool.query(
      `SELECT 
         COUNT(*)::int AS "memberCount",
         COUNT(*) FILTER (WHERE role = 'CLUB_ADMIN')::int AS "clubAdminCount",
         COUNT(*) FILTER (WHERE role = 'VOLUNTEER')::int AS "volunteerCount"
       FROM users
       WHERE club_id = $1 AND is_active = TRUE`,
      [clubId]
    );

    const counts = countsResult.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        club: clubResult.rows[0],
        memberCount: counts.memberCount,
        clubAdminCount: counts.clubAdminCount,
        volunteerCount: counts.volunteerCount
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClub,
  getClubs,
  getClubById,
  updateClub,
  deactivateClub,
  activateClub,
  getClubMembers,
  getClubSummary
};
