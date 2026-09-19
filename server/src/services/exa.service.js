/**
 * Exa Search Service
 * Optional external retrieval component for public knowledge enhancement.
 * Never sends private event documents to external search.
 * Fails gracefully if EXA_API_KEY is not configured or if the service is unreachable.
 */

const searchPublicContext = async (query, options = {}) => {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey || apiKey === 'your_exa_api_key' || !apiKey.trim()) {
    return [];
  }

  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim()
      },
      body: JSON.stringify({
        query,
        numResults: options.numResults || 3,
        useAutoprompt: true
      })
    });

    if (!response.ok) {
      console.warn(`[Exa Service] Exa API returned status ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.warn('[Exa Service] Exa search failed gracefully:', err.message);
    return [];
  }
};

module.exports = {
  searchPublicContext
};
