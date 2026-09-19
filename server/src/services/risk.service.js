const { pool } = require('../config/database');

/**
 * Deterministic Risk Detection Rules
 */
const detectOverdueTasks = (tasks) => {
  const now = new Date();
  const hasOverdue = tasks.some(t => {
    if (!t.deadline || t.status === 'done') return false;
    return new Date(t.deadline) < now;
  });

  if (hasOverdue) {
    return {
      riskCode: 'OVERDUE_TASK',
      description: 'Task is overdue',
      severity: 'high',
      suggestedAction: 'Review the task, contact the assignee, and update the deadline or complete the task.'
    };
  }
  return null;
};

const detectBlockedTasks = (tasks) => {
  const hasBlocked = tasks.some(t => t.status === 'blocked');
  if (hasBlocked) {
    return {
      riskCode: 'BLOCKED_TASK',
      description: 'Task is blocked',
      severity: 'high',
      suggestedAction: 'Identify the blocker and assign an action owner to unblock the task.'
    };
  }
  return null;
};

const detectUnassignedTasks = (tasks) => {
  const hasUnassigned = tasks.some(t => t.assigned_to === null && t.status !== 'done');
  if (hasUnassigned) {
    return {
      riskCode: 'UNASSIGNED_TASK',
      description: 'Task has no assigned owner',
      severity: 'medium',
      suggestedAction: 'Assign the task to an appropriate club member.'
    };
  }
  return null;
};

const detectNoVolunteers = (event, volunteerCount) => {
  if (volunteerCount === 0 && ['upcoming', 'ongoing'].includes(event.status)) {
    return {
      riskCode: 'NO_VOLUNTEERS',
      description: 'Event has no assigned volunteers',
      severity: 'high',
      suggestedAction: 'Assign volunteers to the event before event operations begin.'
    };
  }
  return null;
};

const detectLowVolunteerCount = (event, volunteerCount, minVolunteers = 3) => {
  if (volunteerCount > 0 && volunteerCount < minVolunteers && ['upcoming', 'ongoing'].includes(event.status)) {
    return {
      riskCode: 'LOW_VOLUNTEER_COUNT',
      description: 'Event has fewer volunteers than the configured minimum',
      severity: 'medium',
      suggestedAction: 'Recruit or assign additional volunteers before event operations begin.'
    };
  }
  return null;
};

const detectMultipleBlockedTasks = (tasks) => {
  const blockedCount = tasks.filter(t => t.status === 'blocked').length;
  if (blockedCount >= 3) {
    return {
      riskCode: 'MULTIPLE_BLOCKED_TASKS',
      description: 'Multiple tasks are blocked',
      severity: 'critical',
      suggestedAction: 'Review the blocked tasks immediately and resolve the underlying blockers.'
    };
  }
  return null;
};

/**
 * Orchestrates rule-based risk detection for an event inside a transactional unit.
 * Deduplicates open risks and automatically resolves obsolete risks.
 *
 * @param {string} eventId 
 * @returns {Promise<{ created: number, resolved: number, openRisks: Array<object> }>}
 */
const detectEventRisks = async (eventId) => {
  const minVolunteers = parseInt(process.env.RISK_MIN_VOLUNTEERS || '3', 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch Event
    const eventRes = await client.query(
      'SELECT id, name, status, event_date FROM events WHERE id = $1',
      [eventId]
    );

    if (eventRes.rows.length === 0) {
      const err = new Error('Event not found');
      err.statusCode = 404;
      throw err;
    }

    const event = eventRes.rows[0];

    // 2. Fetch Tasks
    const tasksRes = await client.query(
      'SELECT id, status, deadline, assigned_to FROM tasks WHERE event_id = $1',
      [eventId]
    );
    const tasks = tasksRes.rows;

    // 3. Fetch Volunteer count
    const volRes = await client.query(
      'SELECT COUNT(*)::int AS count FROM volunteers WHERE event_id = $1',
      [eventId]
    );
    const volunteerCount = volRes.rows[0].count;

    // 4. Run all modular risk rules
    const activeRules = [
      detectOverdueTasks(tasks),
      detectBlockedTasks(tasks),
      detectUnassignedTasks(tasks),
      detectNoVolunteers(event, volunteerCount),
      detectLowVolunteerCount(event, volunteerCount, minVolunteers),
      detectMultipleBlockedTasks(tasks)
    ].filter(r => r !== null);

    const activeRuleMap = new Map();
    for (const rule of activeRules) {
      activeRuleMap.set(rule.riskCode, rule);
    }

    // 5. Fetch existing risks for this event
    const existingRisksRes = await client.query(
      'SELECT id, risk_code, status FROM risks WHERE event_id = $1 FOR UPDATE',
      [eventId]
    );
    const existingRisks = existingRisksRes.rows;

    let createdCount = 0;
    let resolvedCount = 0;

    // 6. Handle active rules (create or reopen)
    for (const [riskCode, rule] of activeRuleMap.entries()) {
      const existingOpen = existingRisks.find(r => r.risk_code === riskCode && r.status === 'open');

      if (!existingOpen) {
        // Check if there is an existing resolved record that we can reopen, or create new
        const existingResolved = existingRisks.find(r => r.risk_code === riskCode && r.status === 'resolved');

        if (existingResolved) {
          await client.query(
            `UPDATE risks
             SET status = 'open', description = $1, severity = $2, suggested_action = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [rule.description, rule.severity, rule.suggestedAction, existingResolved.id]
          );
          createdCount++;
        } else {
          await client.query(
            `INSERT INTO risks (event_id, risk_code, description, severity, suggested_action, status)
             VALUES ($1, $2, $3, $4, $5, 'open')
             ON CONFLICT (event_id, risk_code) WHERE status = 'open' DO NOTHING`,
            [eventId, riskCode, rule.description, rule.severity, rule.suggestedAction]
          );
          createdCount++;
        }
      }
    }

    // 7. Auto-resolve existing open risks that are no longer triggered
    for (const existing of existingRisks) {
      if (existing.status === 'open' && existing.risk_code && !activeRuleMap.has(existing.risk_code)) {
        await client.query(
          `UPDATE risks 
           SET status = 'resolved', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [existing.id]
        );
        resolvedCount++;
      }
    }

    await client.query('COMMIT');

    // 8. Fetch current open risks
    const openRisksRes = await pool.query(
      `SELECT 
         id,
         event_id AS "eventId",
         risk_code AS "riskCode",
         description,
         severity,
         suggested_action AS "suggestedAction",
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM risks
       WHERE event_id = $1 AND status = 'open'
       ORDER BY 
         CASE severity 
           WHEN 'critical' THEN 1 
           WHEN 'high' THEN 2 
           WHEN 'medium' THEN 3 
           WHEN 'low' THEN 4 
           ELSE 5 
         END ASC,
         created_at DESC`,
      [eventId]
    );

    return {
      created: createdCount,
      resolved: resolvedCount,
      openRisks: openRisksRes.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  detectOverdueTasks,
  detectBlockedTasks,
  detectUnassignedTasks,
  detectNoVolunteers,
  detectLowVolunteerCount,
  detectMultipleBlockedTasks,
  detectEventRisks
};
