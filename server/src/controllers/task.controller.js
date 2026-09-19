const { pool } = require('../config/database');
const { validateTaskAssignee } = require('../services/task.service');

const ALLOWED_TASK_STATUSES = ['todo', 'in_progress', 'done', 'blocked'];

/**
 * Create a manual task for an event
 * POST /api/events/:eventId/tasks
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const createTask = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { description, assignedTo, deadline } = req.body;
    const event = req.event;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task description is required'
      });
    }

    let parsedDeadline = null;
    if (deadline) {
      if (isNaN(Date.parse(deadline))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deadline timestamp format'
        });
      }
      parsedDeadline = new Date(deadline);
    }

    let assignedUserId = null;
    let assigneeObj = null;

    if (assignedTo) {
      const validation = await validateTaskAssignee(assignedTo, eventId, event.club_id);
      if (!validation.valid) {
        return res.status(validation.status).json({
          success: false,
          message: validation.message
        });
      }
      assignedUserId = assignedTo;
      assigneeObj = {
        id: validation.user.id,
        name: validation.user.name,
        email: validation.user.email
      };
    }

    const insertResult = await pool.query(
      `INSERT INTO tasks (event_id, description, assigned_to, deadline, status, source)
       VALUES ($1, $2, $3, $4, 'todo', 'manual')
       RETURNING id, event_id AS "eventId", description, assigned_to AS "assignedTo", deadline, status, source, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [eventId, description.trim(), assignedUserId, parsedDeadline]
    );

    const task = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        task: {
          id: task.id,
          eventId: task.eventId,
          description: task.description,
          assignedTo: assigneeObj,
          deadline: task.deadline,
          status: task.status,
          source: task.source,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all tasks for an event
 * GET /api/events/:eventId/tasks
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const listTasks = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT 
         t.id,
         t.event_id AS "eventId",
         t.description,
         t.deadline,
         t.status,
         t.source,
         t.created_at AS "createdAt",
         t.updated_at AS "updatedAt",
         u.id AS "assigneeId",
         u.name AS "assigneeName",
         u.email AS "assigneeEmail"
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.event_id = $1
       ORDER BY t.deadline ASC NULLS LAST, t.created_at ASC`,
      [eventId]
    );

    const tasks = result.rows.map(row => ({
      id: row.id,
      eventId: row.eventId,
      description: row.description,
      assignedTo: row.assigneeId ? {
        id: row.assigneeId,
        name: row.assigneeName,
        email: row.assigneeEmail
      } : null,
      deadline: row.deadline,
      status: row.status,
      source: row.source,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    return res.status(200).json({
      success: true,
      data: {
        tasks
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single task by ID
 * GET /api/events/:eventId/tasks/:taskId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const getTaskById = async (req, res, next) => {
  try {
    const { eventId, taskId } = req.params;

    const result = await pool.query(
      `SELECT 
         t.id,
         t.event_id AS "eventId",
         t.description,
         t.deadline,
         t.status,
         t.source,
         t.created_at AS "createdAt",
         t.updated_at AS "updatedAt",
         u.id AS "assigneeId",
         u.name AS "assigneeName",
         u.email AS "assigneeEmail"
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = $1 AND t.event_id = $2`,
      [taskId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found for this event'
      });
    }

    const row = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        task: {
          id: row.id,
          eventId: row.eventId,
          description: row.description,
          assignedTo: row.assigneeId ? {
            id: row.assigneeId,
            name: row.assigneeName,
            email: row.assigneeEmail
          } : null,
          deadline: row.deadline,
          status: row.status,
          source: row.source,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task details (description, assignedTo, deadline)
 * PUT /api/events/:eventId/tasks/:taskId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const updateTask = async (req, res, next) => {
  try {
    const { eventId, taskId } = req.params;
    const { description, assignedTo, deadline } = req.body;
    const event = req.event;

    // Check task exists and belongs to this event
    const taskCheck = await pool.query(
      'SELECT id, description, assigned_to, deadline FROM tasks WHERE id = $1 AND event_id = $2',
      [taskId, eventId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found for this event'
      });
    }

    const currentTask = taskCheck.rows[0];

    if (description !== undefined && (typeof description !== 'string' || !description.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Task description cannot be empty'
      });
    }

    let updatedDeadline = currentTask.deadline;
    if (deadline !== undefined) {
      if (deadline === null) {
        updatedDeadline = null;
      } else {
        if (isNaN(Date.parse(deadline))) {
          return res.status(400).json({
            success: false,
            message: 'Invalid deadline timestamp format'
          });
        }
        updatedDeadline = new Date(deadline);
      }
    }

    let updatedAssignedTo = currentTask.assigned_to;
    if (assignedTo !== undefined) {
      if (assignedTo === null) {
        updatedAssignedTo = null;
      } else {
        const validation = await validateTaskAssignee(assignedTo, eventId, event.club_id);
        if (!validation.valid) {
          return res.status(validation.status).json({
            success: false,
            message: validation.message
          });
        }
        updatedAssignedTo = assignedTo;
      }
    }

    const updatedDescription = description !== undefined ? description.trim() : currentTask.description;

    const updateResult = await pool.query(
      `UPDATE tasks
       SET description = $1, assigned_to = $2, deadline = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND event_id = $5
       RETURNING id, event_id AS "eventId", description, assigned_to AS "assignedTo", deadline, status, source, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [updatedDescription, updatedAssignedTo, updatedDeadline, taskId, eventId]
    );

    const updated = updateResult.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: {
        task: updated
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task status
 * PATCH /api/events/:eventId/tasks/:taskId/status
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (assigned to this specific task)
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const { eventId, taskId } = req.params;
    const { status } = req.body;
    const { role, userId } = req.user;

    if (!status || !ALLOWED_TASK_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_TASK_STATUSES.join(', ')}`
      });
    }

    // Verify task exists and belongs to this event
    const taskCheck = await pool.query(
      'SELECT id, event_id, assigned_to, status FROM tasks WHERE id = $1 AND event_id = $2',
      [taskId, eventId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found for this event'
      });
    }

    const task = taskCheck.rows[0];

    // VOLUNTEER can ONLY update status if the task is assigned to them
    if (role === 'VOLUNTEER' && task.assigned_to !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Volunteers can only update status of tasks assigned to them.'
      });
    }

    const updateResult = await pool.query(
      `UPDATE tasks
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND event_id = $3
       RETURNING id, event_id AS "eventId", description, assigned_to AS "assignedTo", deadline, status, source, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [status, taskId, eventId]
    );

    return res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: {
        task: updateResult.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a task
 * DELETE /api/events/:eventId/tasks/:taskId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const deleteTask = async (req, res, next) => {
  try {
    const { eventId, taskId } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND event_id = $2 RETURNING id',
      [taskId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found for this event'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask
};
