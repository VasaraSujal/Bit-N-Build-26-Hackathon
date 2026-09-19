const { pool } = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildAnnouncementPrompt } = require('./prompts/announcement.prompt');

/**
 * Generate AI announcement draft using Gemini and save to database
 * 
 * @param {object} params
 * @param {string} params.eventId
 * @param {string} params.purpose
 * @param {string} params.details
 * @param {object} [params.eventContext]
 * @returns {Promise<object>} Created announcement database record
 */
const generateAnnouncementDraft = async ({ eventId, purpose, details, eventContext = {} }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  let draftText = '';

  const fallbackDraft = `📢 Announcement: ${purpose.trim()}\n\n${details.trim()}`;

  if (!apiKey || apiKey === 'test_gemini_api_key' || !apiKey.trim()) {
    draftText = fallbackDraft;
  } else {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const prompt = buildAnnouncementPrompt({
        purpose,
        details,
        eventName: eventContext.eventName,
        eventDate: eventContext.eventDate,
        eventDescription: eventContext.eventDescription,
        clubName: eventContext.clubName
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      try {
        const parsed = JSON.parse(responseText);
        draftText = typeof parsed.draftText === 'string' && parsed.draftText.trim()
          ? parsed.draftText.trim()
          : fallbackDraft;
      } catch (parseErr) {
        console.warn('[Announcement Service] JSON parse failed, using raw response or fallback');
        draftText = responseText.slice(0, 1000).trim() || fallbackDraft;
      }
    } catch (geminiError) {
      console.warn('[Announcement Service] Gemini generation failed, using fallback:', geminiError.message);
      draftText = fallbackDraft;
    }
  }

  // Persist draft in database
  const insertRes = await pool.query(
    `INSERT INTO announcements (event_id, draft_text, final_text, sent_at, channel)
     VALUES ($1, $2, NULL, NULL, NULL)
     RETURNING 
       id,
       event_id AS "eventId",
       draft_text AS "draftText",
       final_text AS "finalText",
       sent_at AS "sentAt",
       channel,
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [eventId, draftText]
  );

  const row = insertRes.rows[0];

  return {
    id: row.id,
    eventId: row.eventId,
    draftText: row.draftText,
    finalText: row.finalText,
    sentAt: row.sentAt,
    channel: row.channel,
    status: 'draft',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

module.exports = {
  generateAnnouncementDraft
};
