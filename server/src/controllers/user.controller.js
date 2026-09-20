const { pool } = require('../config/database');
const { hashPassword } = require('../utils/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin User Creation
 * POST /api/users
 * Access: SUPER_ADMIN, CLUB_ADMIN
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, clubId } = req.body;
    const currentUserRole = req.user.role;
    const currentUserClubId = req.user.clubId;

    // 1. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check duplicate email
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // 3. Resolve Role & Club Assignment according to Caller's Role
    let targetRole = 'VOLUNTEER';
    let targetClubId = null;

    if (currentUserRole === 'CLUB_ADMIN') {
      // Club Admins can ONLY create Volunteers for their own club or unassigned
      targetRole = 'VOLUNTEER';
      targetClubId = clubId !== undefined ? (clubId || null) : currentUserClubId;

      if (targetClubId && targetClubId !== currentUserClubId) {
        return res.status(403).json({
          success: false,
          message: 'Club Admins can only assign users to their own club'
        });
      }
    } else if (currentUserRole === 'SUPER_ADMIN') {
      const allowedRoles = ['VOLUNTEER', 'CLUB_ADMIN'];
      if (role && allowedRoles.includes(role.toUpperCase())) {
        targetRole = role.toUpperCase();
      }
      targetClubId = clubId || null;
    }

    // If targetClubId specified, verify club exists
    if (targetClubId) {
      const clubCheck = await pool.query('SELECT id FROM clubs WHERE id = $1', [targetClubId]);
      if (clubCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Target club not found'
        });
      }
    }

    // 4. Hash password and insert user
    const hashedPassword = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, club_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, name, email, role, club_id AS "clubId", is_active AS "isActive", created_at AS "createdAt"`,
      [name.trim(), normalizedEmail, hashedPassword, targetRole, targetClubId]
    );

    const newUser = result.rows[0];

    return res.status(201).json({
      success: true,
      message: `User created successfully as ${targetRole}`,
      data: {
        user: newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List Users with filters (unassigned pool, club search, role filter)
 * GET /api/users
 * Access: SUPER_ADMIN, CLUB_ADMIN
 */
const listUsers = async (req, res, next) => {
  try {
    const { unassigned, clubId, role, search } = req.query;
    const currentUserRole = req.user.role;
    const currentUserClubId = req.user.clubId;

    let query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.club_id AS "clubId", 
        c.name AS "clubName",
        u.is_active AS "isActive", 
        u.created_at AS "createdAt"
      FROM users u
      LEFT JOIN clubs c ON u.club_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by unassigned (club_id IS NULL)
    if (unassigned === 'true') {
      query += ` AND u.club_id IS NULL`;
    } else if (clubId) {
      // If caller is CLUB_ADMIN, prevent looking into unauthorized clubs
      if (currentUserRole === 'CLUB_ADMIN' && clubId !== currentUserClubId) {
        return res.status(403).json({
          success: false,
          message: 'Club Admins can only view members of their assigned club'
        });
      }
      params.push(clubId);
      query += ` AND u.club_id = $${params.length}`;
    } else if (currentUserRole === 'CLUB_ADMIN' && unassigned !== 'true') {
      // By default for CLUB_ADMIN (if no specific filter), return their club members OR unassigned members
      params.push(currentUserClubId);
      query += ` AND (u.club_id = $${params.length} OR u.club_id IS NULL)`;
    }

    // Role filter
    if (role) {
      params.push(role.toUpperCase());
      query += ` AND u.role = $${params.length}`;
    }

    // Search query (name or email)
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: {
        users: result.rows,
        total: result.rows.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get 360-degree user profile and event/task history
 * GET /api/users/:userId/profile
 * Access: SUPER_ADMIN, CLUB_ADMIN
 */
const getUserProfileHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserRole = req.user.role;
    const currentUserClubId = req.user.clubId;

    // 1. Fetch user details
    const userResult = await pool.query(
      `SELECT 
         u.id, 
         u.name, 
         u.email, 
         u.role, 
         u.club_id AS "clubId", 
         c.name AS "clubName",
         u.is_active AS "isActive", 
         u.created_at AS "createdAt"
       FROM users u
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const targetUser = userResult.rows[0];

    // Access control for CLUB_ADMIN: target user must belong to their club OR be unassigned
    if (currentUserRole === 'CLUB_ADMIN') {
      if (targetUser.clubId && targetUser.clubId !== currentUserClubId) {
        return res.status(403).json({
          success: false,
          message: 'Club Admins can only view profiles of members in their club or unassigned members'
        });
      }
    }

    // 2. Fetch event participation history
    const eventsResult = await pool.query(
      `SELECT 
         e.id AS "eventId",
         e.name AS "eventName",
         e.event_date AS "eventDate",
         e.status AS "eventStatus",
         c.name AS "clubName",
         v.responsibility,
         v.contact,
         v.created_at AS "assignedAt"
       FROM volunteers v
       JOIN events e ON v.event_id = e.id
       JOIN clubs c ON e.club_id = c.id
       WHERE v.user_id = $1
       ORDER BY e.event_date DESC`,
      [userId]
    );

    // 3. Fetch assigned tasks & statuses
    const tasksResult = await pool.query(
      `SELECT 
         t.id AS "taskId",
         t.description,
         t.status AS "taskStatus",
         t.deadline,
         t.source,
         e.id AS "eventId",
         e.name AS "eventName"
       FROM tasks t
       JOIN events e ON t.event_id = e.id
       WHERE t.assigned_to = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        profile: targetUser,
        eventHistory: eventsResult.rows,
        tasks: tasksResult.rows,
        stats: {
          totalEventsCount: eventsResult.rows.length,
          totalTasksCount: tasksResult.rows.length,
          completedTasksCount: tasksResult.rows.filter(t => t.taskStatus === 'done').length,
          pendingTasksCount: tasksResult.rows.filter(t => t.taskStatus === 'todo' || t.taskStatus === 'in_progress').length,
          blockedTasksCount: tasksResult.rows.filter(t => t.taskStatus === 'blocked').length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update User details (Name, Email, Role, Club, Active Status)
 * PUT /api/users/:userId
 * Access: SUPER_ADMIN, CLUB_ADMIN
 */
const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { name, email, role, clubId, isActive } = req.body;
    const currentUserRole = req.user.role;
    const currentUserClubId = req.user.clubId;

    // Check user exists
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

    const existingUser = userCheck.rows[0];

    // Access control for CLUB_ADMIN
    if (currentUserRole === 'CLUB_ADMIN') {
      if (existingUser.club_id && existingUser.club_id !== currentUserClubId) {
        return res.status(403).json({
          success: false,
          message: 'Club Admins can only edit members of their assigned club or unassigned members'
        });
      }
    }

    let updatedName = existingUser.name;
    if (name && typeof name === 'string' && name.trim()) {
      updatedName = name.trim();
    }

    let updatedEmail = existingUser.email;
    if (email && typeof email === 'string' && EMAIL_REGEX.test(email.trim())) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== existingUser.email) {
        const dupCheck = await pool.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [normalizedEmail, userId]
        );
        if (dupCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Email address is already in use by another user'
          });
        }
        updatedEmail = normalizedEmail;
      }
    }

    let updatedRole = existingUser.role;
    if (currentUserRole === 'SUPER_ADMIN' && role) {
      const allowedRoles = ['VOLUNTEER', 'CLUB_ADMIN', 'SUPER_ADMIN'];
      if (allowedRoles.includes(role.toUpperCase())) {
        updatedRole = role.toUpperCase();
      }
    }

    let updatedClubId = existingUser.club_id;
    if (clubId !== undefined) {
      if (currentUserRole === 'CLUB_ADMIN' && clubId && clubId !== currentUserClubId) {
        return res.status(403).json({
          success: false,
          message: 'Club Admins cannot transfer members to another club'
        });
      }
      updatedClubId = clubId || null;
    }

    const updatedIsActive = isActive !== undefined ? Boolean(isActive) : existingUser.is_active;

    const result = await pool.query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, club_id = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, name, email, role, club_id AS "clubId", is_active AS "isActive", updated_at AS "updatedAt"`,
      [updatedName, updatedEmail, updatedRole, updatedClubId, updatedIsActive, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete User
 * DELETE /api/users/:userId
 * Access: SUPER_ADMIN, CLUB_ADMIN
 */
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;
    const currentUserClubId = req.user.clubId;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Check user exists
    const userCheck = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.club_id, c.name AS "clubName"
       FROM users u
       LEFT JOIN clubs c ON u.club_id = c.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const targetUser = userCheck.rows[0];

    if (targetUser.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin accounts cannot be deleted'
      });
    }

    if (currentUserRole === 'CLUB_ADMIN') {
      if (targetUser.club_id && targetUser.club_id !== currentUserClubId) {
        return res.status(403).json({
          success: false,
          message: 'Club Admins can only delete members of their own club'
        });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name} deleted successfully`,
      data: {
        deletedUserId: userId
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  listUsers,
  getUserProfileHistory,
  updateUser,
  deleteUser
};
