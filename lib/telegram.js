/**
 * Telegram Bot API client for posting to Telegram groups
 */

const TelegramBot = require('node-telegram-bot-api');

/**
 * Send a message to a Telegram group/channel
 * @param {string} botToken - Telegram bot token
 * @param {string} chatId - Telegram chat ID (group/channel)
 * @param {string} message - Message content to send
 * @param {Object} options - Optional message formatting options
 * @returns {Promise<Object>} Result of the send operation
 */
async function sendMessage(botToken, chatId, message, options = {}) {
  try {
    if (!botToken) {
      throw new Error('Telegram bot token is required');
    }

    if (!chatId) {
      throw new Error('Telegram chat ID is required');
    }

    // Create bot instance (no polling needed for sending messages)
    const bot = new TelegramBot(botToken, { polling: false });

    // Default options for message formatting
    const messageOptions = {
      parse_mode: 'HTML', // Enable HTML formatting
      disable_web_page_preview: true, // Disable link previews
      ...options
    };

    // Send the message
    const result = await bot.sendMessage(chatId, message, messageOptions);

    console.log(`Successfully sent message to Telegram chat ${chatId}`);
    console.log(`Message ID: ${result.message_id}`);

    return {
      success: true,
      messageId: result.message_id,
      chatId: result.chat.id,
      date: result.date,
      result
    };

  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

/**
 * Format community statistics for Telegram
 * @param {Object} stats - Statistics object from Amboss
 * @returns {string} Formatted message for Telegram
 */
function formatStatsMessageForTelegram(stats) {
  const { memberCount, totalChannels, totalCapacity, timestamp, source } = stats;

  // Format the capacity
  const capacityBTC = typeof totalCapacity === 'number' ? totalCapacity.toFixed(2) : totalCapacity;

  // Format numbers with commas
  const formattedMembers = memberCount.toLocaleString();
  const formattedChannels = totalChannels.toLocaleString();

  // Use HTML formatting for Telegram
  const message = `⚡ <b>Nodestrich ♾️ Community Update</b> ⚡

📊 <b>Group Stats:</b>

👥 Members: <b>${formattedMembers}</b>
🔗 Channels: <b>${formattedChannels}</b>
🪙 Capacity: <b>${capacityBTC} BTC</b>

📈 Data from Amboss.space

${new Date(timestamp).toLocaleString('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})} ET

Updated powered by StrichBot ♾️🤖⚡`;

  return message;
}

/**
 * Validate Telegram configuration
 * @param {string} botToken - Telegram bot token
 * @param {string} chatId - Telegram chat ID
 * @returns {Object} Validation result
 */
function validateTelegramConfig(botToken, chatId) {
  const errors = [];

  if (!botToken) {
    errors.push('TELEGRAM_BOT_TOKEN is required');
  } else if (!botToken.includes(':')) {
    errors.push('Invalid TELEGRAM_BOT_TOKEN format');
  }

  if (!chatId) {
    errors.push('TELEGRAM_CHAT_ID is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  sendMessage,
  formatStatsMessageForTelegram,
  validateTelegramConfig
};