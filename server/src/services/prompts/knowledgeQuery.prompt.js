/**
 * Build RAG Knowledge Query Prompt for Gemini
 * 
 * @param {object} params
 * @param {string} params.question - The user query
 * @param {string} params.eventName - The event name
 * @param {string} params.clubName - The club name
 * @param {Array<object>} params.documents - Retrieved document snippets [{ id, title, content }]
 * @returns {string} Prompt string
 */
const buildKnowledgeQueryPrompt = ({ question, eventName = 'Event', clubName = '', documents = [] }) => {
  const docContext = documents
    .map(
      (doc, idx) =>
        `--- DOCUMENT ${idx + 1} ---\n[Document ID: ${doc.id}]\n[Title: ${doc.title}]\n[Content]:\n${doc.content}\n`
    )
    .join('\n');

  return `You are the AI Knowledge Assistant for the college club event: "${eventName}"${clubName ? ` (organized by ${clubName})` : ''}.
Your job is to answer the user's question using ONLY the provided event documents.

CRITICAL INSTRUCTIONS:
1. Ground your answer strictly in the supplied event documents below.
2. DO NOT hallucinate, extrapolate, or invent facts not present in the documents.
3. If the provided documents do NOT contain enough information to answer the question, state: "I could not find enough information in this event's knowledge repository to answer that question." and return an empty array for "sources".
4. If you answer using information from one or more documents, list those documents under "sources" with their exact "documentId" and "title".
5. Keep the answer concise, accurate, and operationally clear.
6. Return your output in valid, parsable JSON matching this schema:

{
  "answer": "Concise answer grounded in the documents",
  "sources": [
    {
      "documentId": "exact-uuid-from-document",
      "title": "exact-title-from-document"
    }
  ]
}

====================
RETRIEVED DOCUMENTS:
====================
${docContext}

====================
USER QUESTION:
====================
${question}
`;
};

module.exports = {
  buildKnowledgeQueryPrompt
};
