const { pool } = require('../config/database');

/**
 * Assign or replace the CLUB_ADMIN for a club (Transactional)
 * PATCH /api/clubs/:clubId/admin
 * Access: SUPER_ADMIN
 */
const assignOrReplaceClubAdmin = async (req, res, next) => {
  const { clubId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'userId is required'
    });
  }

  const client = await pool.connect();

  try {
    // 1. Verify club exists
    const clubCheck = await client.query(
      'SELECT id, name, is_active FROM clubs WHERE id = $1',
      [clubId]
    );

    if (clubCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // 2. Verify target user exists and is active
    const userCheck = await client.query(
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
        message: 'Cannot assign a deactivated user as Club Admin'
      });
    }

    // Target user must be unassigned or already belong to this club
    if (targetUser.club_id && targetUser.club_id !== clubId) {
      return res.status(400).json({
        success: false,
        message: 'User is already assigned to a different club. Please remove them from that club first.'
      });
    }

    // 3. Execute transactional assignment/replacement
    await client.query('BEGIN');

    // Find any current active club admin for this club
    const currentAdminResult = await client.query(
      `SELECT id FROM users 
       WHERE club_id = $1 AND role = 'CLUB_ADMIN' AND is_active = TRUE 
       FOR UPDATE`,
      [clubId]
    );

    // If an existing club admin exists and is a different user, demote to VOLUNTEER
    for (const oldAdmin of currentAdminResult.rows) {
      if (oldAdmin.id !== userId) {
        await client.query(
          `UPDATE users 
           SET role = 'VOLUNTEER', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [oldAdmin.id]
        );
      }
    }

    // Promote target user to CLUB_ADMIN and set club_id
    const updatedUserResult = await client.query(
      `UPDATE users 
       SET role = 'CLUB_ADMIN', club_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, email, role, club_id AS "clubId", is_active AS "isActive", updated_at AS "updatedAt"`,
      [clubId, userId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Club Admin assigned successfully',
      data: {
        user: updatedUserResult.rows[0]
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Assign a volunteer to a club
 * PATCH /api/clubs/:clubId/volunteers/:userId
 * Access: SUPER_ADMIN
 */
const assignVolunteerToClub = async (req, res, next) => {
  try {
    const { clubId, userId } = req.params;

    // Verify club exists
    const clubCheck = await pool.query(
      'SELECT id, name FROM clubs WHERE id = $1',
      [clubId]
    );

    if (clubCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
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

    const user = userCheck.rows[0];

    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign a deactivated user'
      });
    }

    if (user.role !== 'VOLUNTEER') {
      return res.status(400).json({
        success: false,
        message: `User role is ${user.role}. Only users with role VOLUNTEER can be assigned through this endpoint.`
      });
    }

    // If user is already assigned to a different club and caller is not SUPER_ADMIN, disallow
    if (user.club_id && user.club_id !== clubId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'User is currently assigned to another club. Only Super Admin can reassign members across clubs.'
      });
    }

    const updateResult = await pool.query(
      `UPDATE users 
       SET club_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, email, role, club_id AS "clubId", is_active AS "isActive", updated_at AS "updatedAt"`,
      [clubId, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Volunteer assigned to club successfully',
      data: {
        user: updateResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a volunteer from a club (set club_id = NULL)
 * DELETE /api/clubs/:clubId/volunteers/:userId
 * Access: SUPER_ADMIN
 */
const removeVolunteerFromClub = async (req, res, next) => {
  try {
    const { clubId, userId } = req.params;

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

    // Verify user exists and belongs to this club
    const userCheck = await pool.query(
      'SELECT id, name, email, role, club_id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userCheck.rows[0];

    if (user.club_id !== clubId) {
      return res.status(400).json({
        success: false,
        message: 'User is not assigned to this club'
      });
    }

    if (user.role !== 'VOLUNTEER') {
      return res.status(400).json({
        success: false,
        message: `User role is ${user.role}. Use the club admin replacement endpoint for CLUB_ADMIN users.`
      });
    }

    const updateResult = await pool.query(
      `UPDATE users 
       SET club_id = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, name, email, role, club_id AS "clubId", is_active AS "isActive", updated_at AS "updatedAt"`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Volunteer removed from club successfully',
      data: {
        user: updateResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignOrReplaceClubAdmin,
  assignVolunteerToClub,
  removeVolunteerFromClub
};
