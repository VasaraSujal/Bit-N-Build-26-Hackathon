const { pool } = require('../config/database');
const geminiService = require('../services/gemini.service');
const { validateTaskAssignee, checkSameDayTaskConflict } = require('../services/task.service');

const MAX_MEETING_NOTES_LENGTH = 10000;

/**
 * Resolve a suggested owner string against active club members using conservative matching.
 * @param {string|null} suggestedOwner 
 * @param {Array<object>} clubMembers 
 * @returns {object|null} { userId, name } or null
 */
const resolveOwner = (suggestedOwner, clubMembers) => {
  if (!suggestedOwner || typeof suggestedOwner !== 'string' || !suggestedOwner.trim()) {
    return null;
  }

  const query = suggestedOwner.trim().toLowerCase();

  // 1. Exact full name match
  const exactNameMatches = clubMembers.filter(m => m.name.toLowerCase() === query);
  if (exactNameMatches.length === 1) {
    return {
      userId: exactNameMatches[0].id,
      name: exactNameMatches[0].name
    };
  }

  // 2. Exact email match
  const exactEmailMatches = clubMembers.filter(m => m.email.toLowerCase() === query);
  if (exactEmailMatches.length === 1) {
    return {
      userId: exactEmailMatches[0].id,
      name: exactEmailMatches[0].name
    };
  }

  // 3. Unique partial name match (e.g. "Rahul" matching "Rahul Patel")
  const partialMatches = clubMembers.filter(m => {
    const parts = m.name.toLowerCase().split(/\s+/);
    return parts.includes(query) || m.name.toLowerCase().startsWith(query);
  });

  if (partialMatches.length === 1) {
    return {
      userId: partialMatches[0].id,
      name: partialMatches[0].name
    };
  }

  // No unambiguous unique match found
  return null;
};

/**
 * Normalize a suggested deadline into ISO string or null
 * @param {string|null} suggestedDeadline 
 * @returns {string|null}
 */
const normalizeDeadline = (suggestedDeadline) => {
  if (!suggestedDeadline || typeof suggestedDeadline !== 'string') {
    return null;
  }

  const parsed = Date.parse(suggestedDeadline.trim());
  if (isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
};

/**
 * Extract task suggestions from meeting notes (Review only - does NOT create DB records)
 * POST /api/ai/events/:eventId/meeting-tasks/extract
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const extractMeetingTasks = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { meetingNotes } = req.body;
    const event = req.event;

    if (!meetingNotes || typeof meetingNotes !== 'string' || !meetingNotes.trim()) {
      return res.status(400).json({
        success: false,
        message: 'meetingNotes is required and cannot be empty'
      });
    }

    if (meetingNotes.length > MAX_MEETING_NOTES_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Meeting notes exceed maximum allowed character length of ${MAX_MEETING_NOTES_LENGTH}`
      });
    }

    // Load club information for context
    const clubResult = await pool.query(
      'SELECT name FROM clubs WHERE id = $1',
      [event.club_id]
    );
    const clubName = clubResult.rows.length > 0 ? clubResult.rows[0].name : '';

    const eventContext = {
      eventName: event.name,
      eventDate: event.eventDate,
      clubName
    };

    // Normalize escaped and raw newlines
    const normalizedNotes = meetingNotes
      .trim()
      .replace(/\\r\\n|\\n|\\r/g, '\n')
      .replace(/\r\n|\r/g, '\n');

    // Call Gemini AI service
    const rawSuggestions = await geminiService.extractTasksFromMeetingNotes(normalizedNotes, eventContext);

    // Load active club members for owner resolution
    const membersResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE club_id = $1 AND is_active = TRUE',
      [event.club_id]
    );
    const clubMembers = membersResult.rows;

    // Resolve owners and normalize deadlines
    const suggestions = rawSuggestions.map(s => {
      const resolvedOwner = resolveOwner(s.suggestedOwner, clubMembers);
      const suggestedDeadline = normalizeDeadline(s.suggestedDeadline);

      return {
        taskDescription: s.taskDescription,
        suggestedOwner: s.suggestedOwner,
        resolvedOwner,
        suggestedDeadline,
        confidence: s.confidence
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Meeting tasks extracted successfully',
      data: {
        event: {
          id: event.id,
          name: event.name
        },
        suggestions
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Accept and batch create confirmed AI task suggestions (Atomic Transaction)
 * POST /api/ai/events/:eventId/meeting-tasks/accept
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const acceptMeetingTasks = async (req, res, next) => {
  const { eventId } = req.params;
  const { tasks } = req.body;
  const event = req.event;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'tasks array is required and must contain at least one task'
    });
  }

  // Pre-validate all tasks in the batch before starting transaction
  const validatedTasks = [];

  for (let i = 0; i < tasks.length; i++) {
    const item = tasks[i];

    if (!item.taskDescription || typeof item.taskDescription !== 'string' || !item.taskDescription.trim()) {
      return res.status(400).json({
        success: false,
        message: `Task at index ${i} is missing a valid taskDescription`
      });
    }

    let parsedDeadline = null;
    if (item.deadline) {
      if (isNaN(Date.parse(item.deadline))) {
        return res.status(400).json({
          success: false,
          message: `Task at index ${i} has an invalid deadline timestamp format`
        });
      }
      parsedDeadline = new Date(item.deadline);
    }

    let assignedUserId = null;
    if (item.assignedTo) {
      const validation = await validateTaskAssignee(item.assignedTo, eventId, event.club_id);
      if (!validation.valid) {
        return res.status(validation.status || 400).json({
          success: false,
          message: `Task at index ${i}: ${validation.message}`
        });
      }
      assignedUserId = item.assignedTo;
    }

    validatedTasks.push({
      description: item.taskDescription.trim(),
      assignedTo: assignedUserId,
      deadline: parsedDeadline
    });
  }

  // Workload-awareness check: multiple tasks on same calendar day
  const isConfirmed = req.body.confirmSameDayAssignment === true ||
    req.body.confirm_same_day_assignment === true ||
    req.body.confirmSameDayAssignment === 'true' ||
    req.body.confirm_same_day_assignment === 'true';

  if (!isConfirmed) {
    const allConflicting = [];
    const seenAssignments = new Map();

    for (const task of validatedTasks) {
      if (task.assignedTo && task.deadline) {
        const dateKey = `${task.assignedTo}_${new Date(task.deadline).toISOString().slice(0, 10)}`;
        const conflictCheck = await checkSameDayTaskConflict(eventId, task.assignedTo, task.deadline);
        if (conflictCheck.hasConflict) {
          allConflicting.push(...conflictCheck.conflictingTasks);
        } else if (seenAssignments.has(dateKey)) {
          allConflicting.push(seenAssignments.get(dateKey));
        }
        seenAssignments.set(dateKey, {
          description: task.description,
          deadline: task.deadline,
          status: 'todo'
        });
      }
    }

    if (allConflicting.length > 0) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        requires_confirmation: true,
        conflictType: 'SAME_DAY_TASK_ASSIGNMENT',
        message: 'This volunteer already has a task assigned on this date. Are you sure you want to assign another task to this volunteer?',
        data: {
          conflictingTasks: allConflicting,
          existing_tasks: allConflicting
        }
      });
    }
  }

  // Execute atomic task insertion
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const createdTasks = [];

    for (const task of validatedTasks) {
      const result = await client.query(
        `INSERT INTO tasks (event_id, description, assigned_to, deadline, status, source)
         VALUES ($1, $2, $3, $4, 'todo', 'ai_extracted')
         RETURNING id, event_id AS "eventId", description, assigned_to AS "assignedTo", deadline, status, source, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [eventId, task.description, task.assignedTo, task.deadline]
      );
      createdTasks.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'AI tasks created successfully',
      data: {
        createdCount: createdTasks.length,
        tasks: createdTasks
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const { queryKnowledgeRepository } = require('../services/knowledge.service');

const MAX_QUESTION_LENGTH = 1000;

/**
 * Ask questions about event knowledge documents (RAG)
 * POST /api/ai/events/:eventId/knowledge/query
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const queryKnowledge = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { question } = req.body;
    const event = req.event;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'question is required and cannot be empty'
      });
    }

    if (question.trim().length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Question cannot exceed ${MAX_QUESTION_LENGTH} characters`
      });
    }

    // Fetch club name for context
    const clubResult = await pool.query(
      'SELECT name FROM clubs WHERE id = $1',
      [event.club_id]
    );
    const clubName = clubResult.rows.length > 0 ? clubResult.rows[0].name : '';

    const result = await queryKnowledgeRepository({
      eventId,
      question: question.trim(),
      eventName: event.name,
      clubName
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  extractMeetingTasks,
  acceptMeetingTasks,
  queryKnowledge
};
