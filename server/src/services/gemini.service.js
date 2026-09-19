const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildMeetingTaskPrompt } = require('./prompts/meetingTask.prompt');

/**
 * Validate and sanitize an extracted task item from Gemini
 */
const validateTaskSuggestionItem = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  if (!item.taskDescription || typeof item.taskDescription !== 'string' || !item.taskDescription.trim()) {
    return null;
  }

  const taskDescription = item.taskDescription.trim();
  const suggestedOwner = typeof item.suggestedOwner === 'string' && item.suggestedOwner.trim() ? item.suggestedOwner.trim() : null;
  const suggestedDeadline = typeof item.suggestedDeadline === 'string' && item.suggestedDeadline.trim() ? item.suggestedDeadline.trim() : null;
  
  let confidence = 0.8;
  if (typeof item.confidence === 'number' && !isNaN(item.confidence)) {
    confidence = Math.min(1.0, Math.max(0.0, item.confidence));
  }

  return {
    taskDescription,
    suggestedOwner,
    suggestedDeadline,
    confidence
  };
};

/**
 * Extract operational task suggestions from meeting notes using Google Gemini.
 *
 * @param {string} meetingNotes 
 * @param {object} eventContext - { eventName, eventDate, clubName }
 * @returns {Promise<Array<{ taskDescription: string, suggestedOwner: string|null, suggestedDeadline: string|null, confidence: number }>>}
 */
const extractTasksFromMeetingNotes = async (meetingNotes, eventContext = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'test_gemini_api_key' || !apiKey.trim()) {
    const error = new Error('AI service is temporarily unavailable');
    error.statusCode = 503;
    throw error;
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = buildMeetingTaskPrompt(meetingNotes, eventContext);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      const error = new Error('Failed to parse AI response as JSON');
      error.statusCode = 502;
      throw error;
    }

    if (!Array.isArray(parsed)) {
      const error = new Error('Invalid AI response structure: expected an array');
      error.statusCode = 502;
      throw error;
    }

    const validatedSuggestions = parsed
      .map(validateTaskSuggestionItem)
      .filter(item => item !== null);

    return validatedSuggestions;
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    console.error('[Gemini Service] Extraction failed:', err.message);
    const error = new Error('AI service is temporarily unavailable');
    error.statusCode = 503;
    throw error;
  }
};

module.exports = {
  extractTasksFromMeetingNotes
};
