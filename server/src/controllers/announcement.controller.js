const { pool } = require('../config/database');
const { generateAnnouncementDraft } = require('../services/announcement.service');
const discordService = require('../services/discord.service');

const MAX_PURPOSE_LENGTH = 500;
const MAX_DETAILS_LENGTH = 3000;
const MAX_FINAL_TEXT_LENGTH = 5000;

/**
 * Generate AI announcement draft for an event
 * POST /api/ai/events/:eventId/announcements/generate
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const generateAnnouncement = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { purpose, details } = req.body;
    const event = req.event;

    if (!purpose || typeof purpose !== 'string' || !purpose.trim()) {
      return res.status(400).json({
        success: false,
        message: 'purpose is required and cannot be empty'
      });
    }

    if (purpose.trim().length > MAX_PURPOSE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `purpose cannot exceed ${MAX_PURPOSE_LENGTH} characters`
      });
    }

    if (!details || typeof details !== 'string' || !details.trim()) {
      return res.status(400).json({
        success: false,
        message: 'details is required and cannot be empty'
      });
    }

    if (details.trim().length > MAX_DETAILS_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `details cannot exceed ${MAX_DETAILS_LENGTH} characters`
      });
    }

    // Fetch club context
    const clubResult = await pool.query(
      'SELECT name FROM clubs WHERE id = $1',
      [event.club_id]
    );
    const clubName = clubResult.rows.length > 0 ? clubResult.rows[0].name : '';

    const announcement = await generateAnnouncementDraft({
      eventId,
      purpose: purpose.trim(),
      details: details.trim(),
      eventContext: {
        eventName: event.name,
        eventDate: event.eventDate,
        eventDescription: event.description,
        clubName
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Announcement draft generated successfully',
      data: {
        announcement
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all announcements for an event
 * GET /api/events/:eventId/announcements
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const listAnnouncements = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const result = await pool.query(
      `SELECT 
         id,
         event_id AS "eventId",
         draft_text AS "draftText",
         final_text AS "finalText",
         sent_at AS "sentAt",
         channel,
         CASE WHEN sent_at IS NOT NULL THEN 'sent' ELSE 'draft' END AS "status",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM announcements
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      data: {
        announcements: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single announcement by ID
 * GET /api/events/:eventId/announcements/:announcementId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club), VOLUNTEER (own club)
 */
const getAnnouncementById = async (req, res, next) => {
  try {
    const { eventId, announcementId } = req.params;

    const result = await pool.query(
      `SELECT 
         id,
         event_id AS "eventId",
         draft_text AS "draftText",
         final_text AS "finalText",
         sent_at AS "sentAt",
         channel,
         CASE WHEN sent_at IS NOT NULL THEN 'sent' ELSE 'draft' END AS "status",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM announcements
       WHERE id = $1 AND event_id = $2`,
      [announcementId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found for this event'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        announcement: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit / finalize announcement text
 * PUT /api/events/:eventId/announcements/:announcementId
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const editAnnouncement = async (req, res, next) => {
  try {
    const { eventId, announcementId } = req.params;
    const { finalText } = req.body;

    if (!finalText || typeof finalText !== 'string' || !finalText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'finalText is required and cannot be empty'
      });
    }

    if (finalText.trim().length > MAX_FINAL_TEXT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `finalText cannot exceed ${MAX_FINAL_TEXT_LENGTH} characters`
      });
    }

    const checkRes = await pool.query(
      'SELECT id, sent_at FROM announcements WHERE id = $1 AND event_id = $2',
      [announcementId, eventId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found for this event'
      });
    }

    const updateRes = await pool.query(
      `UPDATE announcements
       SET final_text = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND event_id = $3
       RETURNING 
         id,
         event_id AS "eventId",
         draft_text AS "draftText",
         final_text AS "finalText",
         sent_at AS "sentAt",
         channel,
         CASE WHEN sent_at IS NOT NULL THEN 'sent' ELSE 'draft' END AS "status",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [finalText.trim(), announcementId, eventId]
    );

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: {
        announcement: updateRes.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send confirmed announcement to Discord webhook
 * POST /api/events/:eventId/announcements/:announcementId/send
 * Access: SUPER_ADMIN, CLUB_ADMIN (own club)
 */
const sendAnnouncement = async (req, res, next) => {
  try {
    const { eventId, announcementId } = req.params;

    const findRes = await pool.query(
      'SELECT id, event_id, draft_text, final_text, sent_at, channel FROM announcements WHERE id = $1 AND event_id = $2',
      [announcementId, eventId]
    );

    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found for this event'
      });
    }

    const announcement = findRes.rows[0];

    // Check if already sent (Prevent duplicate sends)
    if (announcement.sent_at) {
      return res.status(409).json({
        success: false,
        message: 'Announcement has already been sent.'
      });
    }

    // Message to send: prefer final_text, fall back to draft_text
    const messageToSend = announcement.final_text || announcement.draft_text;
    if (!messageToSend || !messageToSend.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No announcement text available to send'
      });
    }

    // Dispatch to external Discord webhook
    await discordService.sendDiscordAnnouncement(messageToSend);

    // Update database record ONLY after successful Discord response
    const updateRes = await pool.query(
      `UPDATE announcements
       SET sent_at = CURRENT_TIMESTAMP, channel = 'discord', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND event_id = $2
       RETURNING 
         id,
         sent_at AS "sentAt",
         channel,
         'sent' AS "status"`,
      [announcementId, eventId]
    );

    const updated = updateRes.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Announcement sent successfully to Discord',
      data: {
        id: updated.id,
        status: updated.status,
        channel: updated.channel,
        sentAt: updated.sentAt
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

module.exports = {
  generateAnnouncement,
  listAnnouncements,
  getAnnouncementById,
  editAnnouncement,
  sendAnnouncement
};
