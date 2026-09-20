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

/**
 * Check if the assignee already has a task assigned on the same calendar date for this event.
 *
 * @param {string} eventId
 * @param {string} assignedTo
 * @param {Date|string} deadline
 * @param {string} [excludeTaskId]
 * @returns {Promise<{ hasConflict: boolean, conflictingTasks: Array<{ id: string, description: string, deadline: string, status: string }> }>}
 */
const checkSameDayTaskConflict = async (eventId, assignedTo, deadline, excludeTaskId = null) => {
  if (!assignedTo || !deadline) {
    return { hasConflict: false, conflictingTasks: [] };
  }

  let parsedDate;
  try {
    parsedDate = new Date(deadline);
    if (isNaN(parsedDate.getTime())) {
      return { hasConflict: false, conflictingTasks: [] };
    }
  } catch {
    return { hasConflict: false, conflictingTasks: [] };
  }

  let query = `
    SELECT id, description, deadline, status
    FROM tasks
    WHERE event_id = $1
      AND assigned_to = $2
      AND deadline IS NOT NULL
      AND DATE(deadline) = DATE($3::timestamptz)
  `;
  const params = [eventId, assignedTo, parsedDate.toISOString()];

  if (excludeTaskId) {
    query += ` AND id != $4`;
    params.push(excludeTaskId);
  }

  query += ` ORDER BY deadline ASC`;

  const result = await pool.query(query, params);

  return {
    hasConflict: result.rows.length > 0,
    conflictingTasks: result.rows
  };
};

module.exports = {
  validateTaskAssignee,
  checkSameDayTaskConflict
};

