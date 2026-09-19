/**
 * Builds the structured prompt for extracting operational tasks from meeting notes.
 *
 * @param {string} meetingNotes 
 * @param {object} eventContext - { eventName, eventDate, clubName }
 * @returns {string} Prompt string
 */
const buildMeetingTaskPrompt = (meetingNotes, eventContext = {}) => {
  const { eventName = 'Unknown Event', eventDate = '', clubName = '' } = eventContext;

  return `You are an expert event operations assistant extracting concrete operational tasks from college club meeting notes.

EVENT CONTEXT:
- Event Name: ${eventName}
${eventDate ? `- Event Date: ${eventDate}` : ''}
${clubName ? `- Hosting Club: ${clubName}` : ''}

MEETING NOTES:
"""
${meetingNotes}
"""

INSTRUCTIONS:
1. Extract ONLY concrete, actionable operational tasks mentioned in the notes.
2. DO NOT invent tasks, responsibilities, people, or deadlines that are not mentioned.
3. If an assignee/owner is mentioned (e.g. "Rahul", "Priya"), extract their name as "suggestedOwner". If no specific person is identified, set "suggestedOwner" to null.
4. If a target date/deadline is mentioned, extract it as an ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ) in "suggestedDeadline". If no deadline is specified, set "suggestedDeadline" to null.
5. Provide a "confidence" score between 0.0 and 1.0 representing how clearly the task is supported by the meeting notes.
6. Return a STRICT JSON array matching this exact schema, with no markdown formatting outside JSON:

[
  {
    "taskDescription": "string",
    "suggestedOwner": "string or null",
    "suggestedDeadline": "string or null",
    "confidence": 0.95
  }
]`;
};

module.exports = {
  buildMeetingTaskPrompt
};
