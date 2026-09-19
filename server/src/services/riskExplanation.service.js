const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Generate an operational explanation and recommended mitigation for a detected risk using Gemini.
 * Includes graceful fallback if Gemini is unavailable or fails.
 *
 * @param {object} riskContext - { risk, eventName, eventDate, clubName }
 * @returns {Promise<{ explanation: string, impact: string, recommendedAction: string }>}
 */
const explainRisk = async (riskContext) => {
  const { risk, eventName = 'Event', eventDate = '', clubName = '' } = riskContext;

  const fallback = {
    explanation: `Operational risk detected: ${risk.description}.`,
    impact: `May impact overall delivery and timelines for ${eventName}.`,
    recommendedAction: risk.suggested_action || 'Review event operations and take corrective actions.'
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'test_gemini_api_key' || !apiKey.trim()) {
    return fallback;
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

    const prompt = `You are an operational risk advisor for college club event operations.
A rule-based operational risk has been detected:

EVENT: ${eventName}
${eventDate ? `EVENT DATE: ${eventDate}` : ''}
${clubName ? `CLUB: ${clubName}` : ''}
RISK: ${risk.description}
SEVERITY: ${risk.severity}
RULE ACTION: ${risk.suggested_action || ''}

Provide a concise, practical operational breakdown in JSON format:
{
  "explanation": "Clear 1-2 sentence explanation of why this risk matters for the event",
  "impact": "1 sentence describing the operational impact if not resolved",
  "recommendedAction": "1-2 actionable next steps for the club admin"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      explanation: parsed.explanation || fallback.explanation,
      impact: parsed.impact || fallback.impact,
      recommendedAction: parsed.recommendedAction || fallback.recommendedAction
    };
  } catch (err) {
    console.warn('[Risk Explanation] Gemini explanation fallback triggered:', err.message);
    return fallback;
  }
};

module.exports = {
  explainRisk
};
