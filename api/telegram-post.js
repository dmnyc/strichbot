/**
 * Vercel serverless function to post Lightning Network statistics to Telegram
 * This function is triggered by a cron job defined in vercel.json
 */

const { fetchCommunityStats } = require('../lib/amboss');
const { sendMessage, formatStatsMessageForTelegram, validateTelegramConfig } = require('../lib/telegram');
const { securityMiddleware, setSecurityHeaders } = require('../lib/security');
const { fetchBlockData } = require('../lib/mempool');
const { storeStats, cleanupOldData } = require('../lib/dataStore');

// Optional version info - fallback if file doesn't exist
let versionInfo;
try {
  versionInfo = require('../lib/version');
} catch (error) {
  versionInfo = { fullVersion: '1.0.0' };
}

export default async function handler(req, res) {
  try {
    // Apply security headers
    setSecurityHeaders(res);

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://strichbot.vercel.app');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cron-Secret, X-API-Key');
      return res.status(200).end();
    }

    // Apply security middleware
    const securityCheck = securityMiddleware(req, res, {
      maxRequests: 3,           // 3 requests per hour for unauthenticated users
      windowMs: 60 * 60 * 1000, // 1 hour window
      allowedMethods: ['GET', 'POST'],
      requireAuth: true         // Require cron secret or API key
    });

    if (!securityCheck.allowed) {
      // Add any additional headers from security check
      if (securityCheck.headers) {
        Object.entries(securityCheck.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      return res.status(securityCheck.status).json({
        success: false,
        error: securityCheck.error,
        timestamp: new Date().toISOString()
      });
    }

    // Log security status
    const authStatus = securityCheck.authenticated ? 'authenticated' : 'rate-limited';
    console.log(`StrichBot v${versionInfo.fullVersion}: Starting Telegram stats posting (${authStatus}, IP: ${securityCheck.clientIp})`);

    // Get environment variables
    const ambossApiKey = process.env.AMBOSS_API_KEY;
    const communityId = process.env.COMMUNITY_ID;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    // Validate Telegram configuration
    const telegramValidation = validateTelegramConfig(telegramBotToken, telegramChatId);
    if (!telegramValidation.valid) {
      console.error('Telegram configuration invalid:', telegramValidation.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid Telegram configuration',
        details: telegramValidation.errors
      });
    }

    // Validate Amboss configuration
    if (!ambossApiKey) {
      console.error('AMBOSS_API_KEY environment variable is required');
      return res.status(400).json({
        success: false,
        error: 'AMBOSS_API_KEY environment variable is required'
      });
    }

    if (!communityId) {
      console.error('COMMUNITY_ID environment variable is required');
      return res.status(400).json({
        success: false,
        error: 'COMMUNITY_ID environment variable is required'
      });
    }

    // Fetch community statistics from Amboss
    console.log('Fetching community stats from Amboss...');
    const stats = await fetchCommunityStats(ambossApiKey, communityId);

    if (!stats) {
      console.log('No statistics available - Telegram post skipped');
      return res.status(200).json({
        success: false,
        message: 'No statistics available from Amboss API - Telegram post skipped',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Stats fetched:', {
      memberCount: stats.memberCount,
      totalChannels: stats.totalChannels,
      totalCapacity: stats.totalCapacity
    });

    // Fetch Bitcoin block height
    console.log('Fetching Bitcoin block height...');
    const blockData = await fetchBlockData();

    if (blockData) {
      console.log('Block data fetched:', { height: blockData.height });
    } else {
      console.log('Block height unavailable, continuing without it');
    }

    // Store statistics for historical analysis
    try {
      console.log('Storing statistics for historical analysis...');
      const statsToStore = {
        ...stats,
        blockHeight: blockData?.height || null
      };
      await storeStats(statsToStore);
      console.log('Statistics stored successfully');

      // Clean up old data (run occasionally)
      if (Math.random() < 0.1) { // 10% chance to run cleanup
        console.log('Running data cleanup...');
        const deletedCount = await cleanupOldData();
        console.log(`Cleanup completed, ${deletedCount} files deleted`);
      }
    } catch (storeError) {
      console.error('Error storing statistics:', storeError);
      // Continue with posting even if storage fails
    }

    // Format message for Telegram
    const message = formatStatsMessageForTelegram(stats, blockData);
    console.log('Formatted Telegram message:', message);

    // Send to Telegram
    console.log('Sending message to Telegram...');
    const telegramResult = await sendMessage(telegramBotToken, telegramChatId, message);

    console.log('Telegram message sent successfully');

    return res.status(200).json({
      success: true,
      message: 'Stats posted to Telegram successfully',
      data: {
        stats,
        telegram: {
          messageId: telegramResult.messageId,
          chatId: telegramResult.chatId,
          sent: true
        },
        version: versionInfo.fullVersion
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in Telegram stats posting:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}