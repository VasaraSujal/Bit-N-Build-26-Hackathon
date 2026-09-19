const { pool } = require('../config/database');
const { detectEventRisks } = require('../services/risk.service');
const { explainRisk } = require('../services/riskExplanation.service');

/**
 * Run deterministic risk detection for an event
 * POST /api/events/:eventId/risks/detect
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const runRiskDetection = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const result = await detectEventRisks(eventId);

    return res.status(200).json({
      success: true,
      message: 'Risk detection completed',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all risks for an event ordered by severity priority
 * GET /api/events/:eventId/risks
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const listEventRisks = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
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
       WHERE event_id = $1
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

    return res.status(200).json({
      success: true,
      data: {
        risks: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single risk by ID
 * GET /api/events/:eventId/risks/:riskId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const getRiskById = async (req, res, next) => {
  try {
    const { eventId, riskId } = req.params;

    const result = await pool.query(
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
       WHERE id = $1 AND event_id = $2`,
      [riskId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found for this event'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        risk: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually resolve a risk
 * PATCH /api/events/:eventId/risks/:riskId/resolve
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const resolveRisk = async (req, res, next) => {
  try {
    const { eventId, riskId } = req.params;

    const result = await pool.query(
      `UPDATE risks
       SET status = 'resolved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND event_id = $2
       RETURNING 
         id,
         event_id AS "eventId",
         risk_code AS "riskCode",
         description,
         severity,
         suggested_action AS "suggestedAction",
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [riskId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found for this event'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Risk resolved successfully',
      data: {
        risk: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually reopen a resolved risk
 * PATCH /api/events/:eventId/risks/:riskId/reopen
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const reopenRisk = async (req, res, next) => {
  try {
    const { eventId, riskId } = req.params;

    const result = await pool.query(
      `UPDATE risks
       SET status = 'open', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND event_id = $2
       RETURNING 
         id,
         event_id AS "eventId",
         risk_code AS "riskCode",
         description,
         severity,
         suggested_action AS "suggestedAction",
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [riskId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found for this event'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Risk reopened successfully',
      data: {
        risk: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate Gemini operational explanation for a risk
 * POST /api/events/:eventId/risks/:riskId/explain
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const explainRiskHandler = async (req, res, next) => {
  try {
    const { eventId, riskId } = req.params;
    const event = req.event;

    const riskRes = await pool.query(
      'SELECT id, description, severity, suggested_action FROM risks WHERE id = $1 AND event_id = $2',
      [riskId, eventId]
    );

    if (riskRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Risk not found for this event'
      });
    }

    const risk = riskRes.rows[0];

    const clubRes = await pool.query(
      'SELECT name FROM clubs WHERE id = $1',
      [event.club_id]
    );
    const clubName = clubRes.rows.length > 0 ? clubRes.rows[0].name : '';

    const explanationResult = await explainRisk({
      risk,
      eventName: event.name,
      eventDate: event.eventDate,
      clubName
    });

    return res.status(200).json({
      success: true,
      data: {
        risk: {
          id: risk.id,
          severity: risk.severity
        },
        explanation: explanationResult.explanation,
        impact: explanationResult.impact,
        recommendedAction: explanationResult.recommendedAction
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runRiskDetection,
  listEventRisks,
  getRiskById,
  resolveRisk,
  reopenRisk,
  explainRiskHandler
};
