const { pool } = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildKnowledgeQueryPrompt } = require('./prompts/knowledgeQuery.prompt');
const { searchPublicContext } = require('./exa.service');

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenize a text string into meaningful keyword tokens
 */
const tokenize = (text) => {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
};

/**
 * Score relevance of a document against query tokens
 */
const scoreDocument = (doc, queryTokens, rawQuery) => {
  let score = 0;
  const titleLower = doc.title.toLowerCase();
  const contentLower = doc.content.toLowerCase();
  const rawQueryLower = rawQuery.toLowerCase().trim();

  // Exact phrase matching bonus
  if (rawQueryLower && (titleLower.includes(rawQueryLower) || contentLower.includes(rawQueryLower))) {
    score += 15;
  }

  for (const token of queryTokens) {
    // Title matches (weight 5)
    if (titleLower.includes(token)) {
      score += 5;
    }

    // Content frequency matches (weight 1 each, up to 10)
    let occurrences = 0;
    let pos = contentLower.indexOf(token);
    while (pos !== -1 && occurrences < 10) {
      occurrences++;
      pos = contentLower.indexOf(token, pos + token.length);
    }
    score += occurrences;
  }

  return score;
};

/**
 * Query event knowledge repository using local document retrieval + Gemini synthesis
 * 
 * @param {object} params
 * @param {string} params.eventId
 * @param {string} params.question
 * @param {string} [params.eventName]
 * @param {string} [params.clubName]
 * @returns {Promise<{ eventId: string, question: string, answer: string, sources: Array<{ documentId: string, title: string }> }>}
 */
const queryKnowledgeRepository = async ({ eventId, question, eventName = 'Event', clubName = '' }) => {
  const trimmedQuestion = question.trim();
  const queryTokens = tokenize(trimmedQuestion);

  // 1. Fetch all documents for the event
  const docsRes = await pool.query(
    'SELECT id, title, content FROM documents WHERE event_id = $1',
    [eventId]
  );
  const eventDocs = docsRes.rows;

  const noContextResponse = {
    eventId,
    question: trimmedQuestion,
    answer: "I could not find enough information in this event's knowledge repository to answer that question.",
    sources: []
  };

  if (eventDocs.length === 0) {
    return noContextResponse;
  }

  // 2. Score and rank documents locally
  const scoredDocs = eventDocs
    .map(doc => ({
      ...doc,
      score: scoreDocument(doc, queryTokens, trimmedQuestion)
    }))
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score);

  // If no documents matched any tokens
  if (scoredDocs.length === 0) {
    return noContextResponse;
  }

  // Pick top K (max 3)
  const topKDocs = scoredDocs.slice(0, 3);
  const retrievedDocMap = new Map(topKDocs.map(d => [d.id, d]));

  // 3. Optional Exa public search (safe query enhancement without sending private documents)
  try {
    await searchPublicContext(trimmedQuestion, { numResults: 2 });
  } catch (exaErr) {
    // Ignore Exa errors
  }

  // 4. Synthesize with Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'test_gemini_api_key' || !apiKey.trim()) {
    // Graceful fallback when Gemini API key is missing or simulated offline
    return {
      eventId,
      question: trimmedQuestion,
      answer: `Information from event documents:\n${topKDocs[0].content.slice(0, 300)}...`,
      sources: topKDocs.map(d => ({ documentId: d.id, title: d.title }))
    };
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

    const prompt = buildKnowledgeQueryPrompt({
      question: trimmedQuestion,
      eventName,
      clubName,
      documents: topKDocs
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      console.warn('[Knowledge Service] Gemini output parse error, falling back to clean response');
      return {
        eventId,
        question: trimmedQuestion,
        answer: responseText.slice(0, 500),
        sources: topKDocs.map(d => ({ documentId: d.id, title: d.title }))
      };
    }

    // Validate sources
    const validSources = [];
    if (Array.isArray(parsed.sources)) {
      for (const s of parsed.sources) {
        if (s && s.documentId && retrievedDocMap.has(s.documentId)) {
          const matched = retrievedDocMap.get(s.documentId);
          validSources.push({
            documentId: matched.id,
            title: matched.title
          });
        }
      }
    }

    // If answer indicates no information, ensure empty sources
    const answerText = typeof parsed.answer === 'string' ? parsed.answer.trim() : '';
    if (
      !answerText ||
      answerText.toLowerCase().includes('could not find enough information') ||
      answerText.toLowerCase().includes('does not provide enough information')
    ) {
      return {
        eventId,
        question: trimmedQuestion,
        answer: "I could not find enough information in this event's knowledge repository to answer that question.",
        sources: []
      };
    }

    // Fallback source to retrieved docs if Gemini omitted source array but answered from context
    const finalSources = validSources.length > 0 ? validSources : topKDocs.map(d => ({ documentId: d.id, title: d.title }));

    return {
      eventId,
      question: trimmedQuestion,
      answer: answerText,
      sources: finalSources
    };
  } catch (geminiError) {
    console.warn('[Knowledge Service] Gemini error occurred, triggering controlled fallback:', geminiError.message);
    return {
      eventId,
      question: trimmedQuestion,
      answer: `According to "${topKDocs[0].title}": ${topKDocs[0].content.slice(0, 300)}...`,
      sources: topKDocs.map(d => ({ documentId: d.id, title: d.title }))
    };
  }
};

module.exports = {
  tokenize,
  scoreDocument,
  queryKnowledgeRepository
};
