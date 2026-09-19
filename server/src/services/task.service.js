const { pool } = require('../config/database');

/**
 * Validate that a target user is eligible to be assigned to an event task.
 * Eligible users:
 * - Active user in the users table
 * - Not SUPER_ADMIN
 * - Belongs to the same club as the event
 * - Either CLUB_ADMIN of the club, OR registered in the volunteers table for this event
 *
 * @param {string} userId
 * @param {string} eventId
 * @param {string} eventClubId
 * @returns {Promise<{ valid: boolean, status?: number, message?: string, user?: object }>}
 */
const validateTaskAssignee = async (userId, eventId, eventClubId) => {
  if (!userId) {
    return { valid: true, user: null };
  }

  const userCheck = await pool.query(
    'SELECT id, name, email, role, club_id, is_active FROM users WHERE id = $1',
    [userId]
  );

  if (userCheck.rows.length === 0) {
    return { valid: false, status: 404, message: 'Assigned user not found' };
  }

  const user = userCheck.rows[0];

  if (!user.is_active) {
    return { valid: false, status: 400, message: 'Cannot assign a deactivated user' };
  }

  if (user.role === 'SUPER_ADMIN') {
    return { valid: false, status: 403, message: 'SUPER_ADMIN cannot be assigned to an event task' };
  }

  if (!user.club_id || user.club_id !== eventClubId) {
    return { valid: false, status: 403, message: 'Assigned user must belong to the event host club' };
  }

  // If user is CLUB_ADMIN of this club, they are eligible
  if (user.role === 'CLUB_ADMIN') {
    return { valid: true, user };
  }

  // If user is VOLUNTEER, they must be assigned to this event in the volunteers table
  const volunteerCheck = await pool.query(
    'SELECT id FROM volunteers WHERE event_id = $1 AND user_id = $2',
    [eventId, userId]
  );

  if (volunteerCheck.rows.length === 0) {
    return {
      valid: false,
      status: 403,
      message: 'Volunteer must be assigned to this event before receiving event tasks'
    };
  }

  return { valid: true, user };
};

module.exports = {
  validateTaskAssignee
};
