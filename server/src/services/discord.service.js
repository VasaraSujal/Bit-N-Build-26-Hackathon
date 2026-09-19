/**
 * Discord Webhook Service
 * Handles external notification dispatch to Discord webhooks.
 * Never leaks the webhook URL in logs, errors, or API responses.
 */

const sendDiscordAnnouncement = async (message) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl === 'your_discord_webhook_url' || !webhookUrl.trim().startsWith('http')) {
    const error = new Error('Discord integration is not configured.');
    error.statusCode = 503;
    throw error;
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    const error = new Error('Announcement message content cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message.trim()
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Discord Service] Webhook delivery failed with status: ${response.status}`);
      const error = new Error('Discord webhook delivery failed.');
      error.statusCode = 502;
      throw error;
    }

    return { success: true };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.statusCode) {
      throw err;
    }

    console.warn('[Discord Service] Network/delivery error during Discord dispatch:', err.name || err.message);
    const error = new Error('Failed to connect to Discord webhook service.');
    error.statusCode = 502;
    throw error;
  }
};

module.exports = {
  sendDiscordAnnouncement
};
