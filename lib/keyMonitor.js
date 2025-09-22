/**
 * API Key Expiration Monitoring System
 * Monitors Amboss API key expiration and sends Telegram notifications
 */

const { sendMessage } = require('./telegram');

/**
 * Check if API key is approaching expiration
 * @param {string} expiryDate - API key expiration date in ISO 8601 format
 * @param {Array} warningDays - Array of warning days [7, 3, 1]
 * @returns {Object} Check result with warning info
 */
function checkKeyExpiration(expiryDate, warningDays = [7, 3, 1]) {
  try {
    if (!expiryDate) {
      return {
        shouldWarn: false,
        error: 'No expiration date configured'
      };
    }

    const expiry = new Date(expiryDate);
    const now = new Date();

    // Validate expiration date
    if (isNaN(expiry.getTime())) {
      return {
        shouldWarn: false,
        error: 'Invalid expiration date format'
      };
    }

    // Calculate days until expiration
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilExpiry = Math.ceil((expiry - now) / msPerDay);

    console.log(`API key expires in ${daysUntilExpiry} days (${expiry.toISOString()})`);

    // Check if we're within a warning period
    const warningDay = warningDays.find(days => daysUntilExpiry === days);

    if (warningDay) {
      return {
        shouldWarn: true,
        daysUntilExpiry: warningDay,
        expiryDate: expiry.toISOString(),
        urgency: getUrgencyLevel(warningDay)
      };
    }

    // Check if already expired
    if (daysUntilExpiry < 0) {
      return {
        shouldWarn: true,
        daysUntilExpiry: 0,
        expiryDate: expiry.toISOString(),
        urgency: 'expired',
        expired: true
      };
    }

    return {
      shouldWarn: false,
      daysUntilExpiry,
      expiryDate: expiry.toISOString()
    };

  } catch (error) {
    console.error('Error checking key expiration:', error);
    return {
      shouldWarn: false,
      error: error.message
    };
  }
}

/**
 * Get urgency level based on days until expiration
 * @param {number} days - Days until expiration
 * @returns {string} Urgency level
 */
function getUrgencyLevel(days) {
  if (days <= 1) return 'critical';
  if (days <= 3) return 'high';
  if (days <= 7) return 'medium';
  return 'low';
}

/**
 * Format expiration warning message for Telegram
 * @param {Object} checkResult - Result from checkKeyExpiration
 * @returns {string} Formatted warning message
 */
function formatExpirationWarning(checkResult) {
  const { daysUntilExpiry, urgency, expired } = checkResult;

  if (expired) {
    return `🔥 <b>CRITICAL: Amboss API Key EXPIRED</b> 🔥

🚨 The Amboss API key has expired and StrichBot will stop working!

⚡ <b>Action Required:</b>
1. Generate new API key at Amboss.space
2. Update AMBOSS_API_KEY environment variable
3. Update AMBOSS_API_KEY_EXPIRY_DATE

🤖 StrichBot Admin Alert`;
  }

  let emoji = '⚠️';
  let urgencyText = 'Warning';

  switch (urgency) {
    case 'critical':
      emoji = '🔥';
      urgencyText = 'URGENT';
      break;
    case 'high':
      emoji = '🚨';
      urgencyText = 'Important';
      break;
    case 'medium':
      emoji = '⚠️';
      urgencyText = 'Warning';
      break;
  }

  const dayText = daysUntilExpiry === 1 ? 'day' : 'days';

  return `${emoji} <b>${urgencyText}: Amboss API Key Expiring</b> ${emoji}

⏰ <b>${daysUntilExpiry} ${dayText}</b> until API key expires

🔑 <b>Next Steps:</b>
${daysUntilExpiry <= 3 ? '1. Generate new API key at Amboss.space NOW\n2. Update environment variables\n' : '1. Plan API key renewal\n2. Generate new key at Amboss.space\n'}

📅 Current expiry: ${new Date(checkResult.expiryDate).toISOString().substring(0, 10)}

🤖 StrichBot Admin Alert`;
}

/**
 * Send expiration warning to Telegram
 * @param {string} botToken - Telegram bot token
 * @param {string} chatId - Telegram chat ID
 * @param {Object} checkResult - Result from checkKeyExpiration
 * @returns {Promise<Object>} Send result
 */
async function sendExpirationWarning(botToken, chatId, checkResult) {
  try {
    const message = formatExpirationWarning(checkResult);

    const result = await sendMessage(botToken, chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    console.log(`Sent API key expiration warning (${checkResult.daysUntilExpiry} days)`);
    return result;

  } catch (error) {
    console.error('Error sending expiration warning:', error);
    throw error;
  }
}

/**
 * Load notification state to prevent duplicate warnings
 * @returns {Object} Notification state
 */
function loadNotificationState() {
  try {
    // In a serverless environment, we'll use a simple approach
    // to prevent duplicates within the same day
    const today = new Date().toISOString().substring(0, 10);
    return { lastNotificationDate: null, today };
  } catch (error) {
    console.error('Error loading notification state:', error);
    return { lastNotificationDate: null, today: new Date().toISOString().substring(0, 10) };
  }
}

/**
 * Check if we should send a notification (prevent duplicates)
 * @param {Object} checkResult - Expiration check result
 * @param {Object} state - Notification state
 * @returns {boolean} Whether to send notification
 */
function shouldSendNotification(checkResult, state) {
  if (!checkResult.shouldWarn) return false;

  // For serverless, we'll rely on the cron job running once per day
  // and the specific day matching logic to prevent duplicates
  return true;
}

module.exports = {
  checkKeyExpiration,
  formatExpirationWarning,
  sendExpirationWarning,
  loadNotificationState,
  shouldSendNotification,
  getUrgencyLevel
};