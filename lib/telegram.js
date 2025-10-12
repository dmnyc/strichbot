/**
 * Telegram Bot API client for posting to Telegram groups
 */

const TelegramBot = require('node-telegram-bot-api');
const { getStatsFromDaysAgo } = require('./dataStore');

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
 * @param {Object} blockData - Bitcoin block data from Mempool.space
 * @returns {string} Formatted message for Telegram
 */
function formatStatsMessageForTelegram(stats, blockData = null) {
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

${blockData ? `Block Height: <b>${blockData.height}</b>` : ''}
${new Date(timestamp).toISOString().replace('T', ' ').substring(0, 16)} UTC

Update powered by StrichBot ♾️🤖⚡`;

  return message;
}

/**
 * Get trend indicator emoji based on percentage change
 * @param {number} percentageChange - Percentage change
 * @returns {string} Emoji indicator
 */
function getTrendIndicator(percentageChange) {
  if (percentageChange > 5) return '🚀'; // Significant growth
  if (percentageChange > 0) return '📈'; // Growth
  if (percentageChange < -5) return '📉'; // Significant decline
  if (percentageChange < 0) return '📊'; // Slight decline
  return '➡️'; // No change
}

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change
 */
function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format community statistics with 7-day trends for Telegram
 * @param {Object} stats - Statistics object from Amboss
 * @param {Object} blockData - Bitcoin block data from Mempool.space
 * @returns {Promise<string>} Formatted message for Telegram
 */
async function formatWeeklyStatsMessageForTelegram(stats, blockData = null) {
  const { memberCount, totalChannels, totalCapacity, timestamp, source } = stats;

  // Format the capacity
  const capacityBTC = typeof totalCapacity === 'number' ? totalCapacity.toFixed(2) : totalCapacity;

  // Format numbers with commas
  const formattedMembers = memberCount.toLocaleString();
  const formattedChannels = totalChannels.toLocaleString();

  // Get stats from 7 days ago for comparison
  let trendSection = '';
  try {
    const weekAgoStats = await getStatsFromDaysAgo(7);

    if (weekAgoStats) {
      // Calculate changes
      const memberChange = memberCount - weekAgoStats.memberCount;
      const memberPercentChange = calculatePercentageChange(memberCount, weekAgoStats.memberCount);
      const memberIndicator = getTrendIndicator(memberPercentChange);

      const channelChange = totalChannels - weekAgoStats.totalChannels;
      const channelPercentChange = calculatePercentageChange(totalChannels, weekAgoStats.totalChannels);
      const channelIndicator = getTrendIndicator(channelPercentChange);

      const capacityChange = totalCapacity - weekAgoStats.totalCapacity;
      const capacityPercentChange = calculatePercentageChange(totalCapacity, weekAgoStats.totalCapacity);
      const capacityIndicator = getTrendIndicator(capacityPercentChange);

      // Format changes with + or - sign
      const formattedMemberChange = memberChange >= 0 ? `+${memberChange}` : `${memberChange}`;
      const formattedChannelChange = channelChange >= 0 ? `+${channelChange.toLocaleString()}` : `${channelChange.toLocaleString()}`;
      const formattedCapacityChange = capacityChange >= 0 ? `+${capacityChange.toFixed(2)}` : `${capacityChange.toFixed(2)}`;
      const formattedMemberPercent = memberPercentChange >= 0 ? `+${memberPercentChange.toFixed(2)}` : `${memberPercentChange.toFixed(2)}`;
      const formattedChannelPercent = channelPercentChange >= 0 ? `+${channelPercentChange.toFixed(2)}` : `${channelPercentChange.toFixed(2)}`;
      const formattedCapacityPercent = capacityPercentChange >= 0 ? `+${capacityPercentChange.toFixed(2)}` : `${capacityPercentChange.toFixed(2)}`;

      trendSection = `
👥 Members: <b>${formattedMembers}</b>
   7-day change: ${formattedMemberChange} (${formattedMemberPercent}%)

🔗 Channels: <b>${formattedChannels}</b>
   7-day change: ${formattedChannelChange} (${formattedChannelPercent}%)

🪙 Capacity: <b>${capacityBTC} BTC</b>
   7-day change: ${formattedCapacityChange} BTC (${formattedCapacityPercent}%)`;
    } else {
      // No historical data available, use simple format
      trendSection = `
👥 Members: <b>${formattedMembers}</b>
🔗 Channels: <b>${formattedChannels}</b>
🪙 Capacity: <b>${capacityBTC} BTC</b>`;
    }
  } catch (error) {
    console.error('Error fetching trend data:', error);
    // Fallback to simple format on error
    trendSection = `
👥 Members: <b>${formattedMembers}</b>
🔗 Channels: <b>${formattedChannels}</b>
🪙 Capacity: <b>${capacityBTC} BTC</b>`;
  }

  // Use HTML formatting for Telegram
  const message = `⚡ <b>Nodestrich ♾️ Community Update</b> ⚡

📊 <b>Group Stats:</b>
${trendSection}

📈 Data from Amboss.space

${blockData ? `Block Height: <b>${blockData.height}</b>` : ''}
${new Date(timestamp).toISOString().replace('T', ' ').substring(0, 16)} UTC

Update powered by StrichBot ♾️🤖⚡`;

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
  formatWeeklyStatsMessageForTelegram,
  validateTelegramConfig
};