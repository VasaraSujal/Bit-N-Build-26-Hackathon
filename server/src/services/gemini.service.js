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
 * Deterministic rule-based extractor fallback when Gemini is unreachable or offline
 */
const extractTasksRuleBasedFallback = (meetingNotes) => {
  const lines = meetingNotes.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const suggestions = [];

  const dateRegex = /(?:by|due|on|before)\s+([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?|\d{4}-\d{2}-\d{2})/i;
  const actionRegex = /^(?:[-*•\d.]+\s*)?([A-Za-z\s]+?)\s+(?:needs to|will|to|must|should|is assigned to)\s+(.+)/i;

  for (const line of lines) {
    if (line.toLowerCase().includes('sync') || line.toLowerCase().includes('attendees:') || line.toLowerCase().includes('action items:')) {
      continue;
    }

    const match = line.match(actionRegex);
    if (match) {
      const potentialOwner = match[1].trim();
      let remainingText = match[2].trim();
      
      let deadline = null;
      const dateMatch = remainingText.match(dateRegex);
      if (dateMatch) {
        deadline = dateMatch[1];
      }

      // Check if potentialOwner looks like a person's name (1-3 words)
      const isPerson = potentialOwner.split(/\s+/).length <= 3 && !/^(food|catering|stage|hall|security|audio)/i.test(potentialOwner);

      const taskDesc = line.replace(/^[-*•\d.]+\s*/, '').trim();

      suggestions.push({
        taskDescription: taskDesc,
        suggestedOwner: isPerson ? potentialOwner : null,
        suggestedDeadline: deadline,
        confidence: isPerson ? 0.85 : 0.75
      });
    } else if (/^(?:[-*•\d.]+\s*)(.+)/.test(line)) {
      const cleanText = line.replace(/^[-*•\d.]+\s*/, '').trim();
      if (cleanText.length > 10) {
        let deadline = null;
        const dateMatch = cleanText.match(dateRegex);
        if (dateMatch) {
          deadline = dateMatch[1];
        }

        suggestions.push({
          taskDescription: cleanText,
          suggestedOwner: null,
          suggestedDeadline: deadline,
          confidence: 0.7
        });
      }
    }
  }

  return suggestions.map(validateTaskSuggestionItem).filter(Boolean);
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
    return extractTasksRuleBasedFallback(meetingNotes);
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
      console.warn('[Gemini Service] Failed to parse AI response JSON, falling back to rule-based parser');
      return extractTasksRuleBasedFallback(meetingNotes);
    }

    if (!Array.isArray(parsed)) {
      console.warn('[Gemini Service] AI response was not array, falling back to rule-based parser');
      return extractTasksRuleBasedFallback(meetingNotes);
    }

    const validatedSuggestions = parsed
      .map(validateTaskSuggestionItem)
      .filter(item => item !== null);

    return validatedSuggestions.length > 0 ? validatedSuggestions : extractTasksRuleBasedFallback(meetingNotes);
  } catch (err) {
    console.warn('[Gemini Service] Gemini API call error:', err.message, 'Falling back to deterministic parser.');
    return extractTasksRuleBasedFallback(meetingNotes);
  }
};

module.exports = {
  extractTasksFromMeetingNotes
};
