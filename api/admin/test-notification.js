/**
 * Admin Testing API endpoint
 * Handles test notifications and system health checks
 */

import { setSecurityHeaders } from '../../lib/security.js';

const versionInfo = { fullVersion: '1.0.0' };

export default async function handler(req, res) {
  const { sendMessage, validateTelegramConfig } = await import('../../lib/telegram.js');
  const { publishEvent, parseRelays } = await import('../../lib/nostr.js');
  const { fetchCommunityStats } = await import('../../lib/amboss.js');
  const { fetchBlockData } = await import('../../lib/mempool.js');
  const { generateWeeklyReport, formatTrendReportForNostr, formatTrendReportForTelegram } = await import('../../lib/trendAnalysis.js');

  try {
    // Apply security headers
    setSecurityHeaders(res);

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://strichbot.vercel.app');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowed: ['POST'],
        timestamp: new Date().toISOString()
      });
    }

    // Validate admin token
    const adminToken = req.headers['x-api-key'] || process.env.ADMIN_TOKEN;
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid admin token',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`StrichBot v${versionInfo.fullVersion}: Admin test notification (IP: ${req.headers['x-forwarded-for'] || req.connection?.remoteAddress})`);

    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Test type is required',
        supportedTypes: ['telegram', 'nostr', 'api-test', 'health-check'],
        timestamp: new Date().toISOString()
      });
    }

    switch (type) {
      case 'telegram':
        return await handleTelegramTest(req, res);

      case 'nostr':
        return await handleNostrTest(req, res);

      case 'api-test':
        return await handleApiTest(req, res);

      case 'health-check':
        return await handleHealthCheck(req, res);

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown test type: ${type}`,
          supportedTypes: ['telegram', 'nostr', 'api-test', 'health-check'],
          timestamp: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('Error in admin test notification endpoint:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Test Telegram messaging
 */
async function handleTelegramTest(req, res) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Validate configuration
    const validation = validateTelegramConfig(botToken, chatId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Telegram configuration',
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
    }

    // Send test message
    const testMessage = `🧪 <b>StrichBot Admin Test</b> 🧪

This is a test message from the StrichBot admin interface.

⚡ Bot Status: Online
🤖 Version: ${versionInfo.fullVersion}
📅 Test Time: ${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC

If you received this message, Telegram integration is working correctly! ✅`;

    const result = await sendMessage(botToken, chatId, testMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    return res.status(200).json({
      success: true,
      message: 'Test Telegram message sent successfully',
      data: {
        messageId: result.messageId,
        chatId: result.chatId,
        testTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Telegram test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Telegram test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Test Nostr publishing
 */
async function handleNostrTest(req, res) {
  try {
    const { useTestProfile } = req.body;
    const nsec = useTestProfile && process.env.NOSTR_TEST_NSEC
      ? process.env.NOSTR_TEST_NSEC
      : process.env.NOSTR_NSEC;
    const relayString = process.env.NOSTR_RELAYS;

    if (!nsec) {
      return res.status(400).json({
        success: false,
        error: useTestProfile
          ? 'NOSTR_TEST_NSEC environment variable not configured'
          : 'NOSTR_NSEC environment variable not configured',
        timestamp: new Date().toISOString()
      });
    }

    if (!nsec.startsWith('nsec1')) {
      return res.status(400).json({
        success: false,
        error: 'Nostr private key must be in nsec1 format',
        timestamp: new Date().toISOString()
      });
    }

    // Prepare test message
    const profileType = useTestProfile ? 'TEST PROFILE' : 'Production Profile';
    const testMessage = `🧪 StrichBot Admin Test ⚡

This is a test note from the StrichBot admin interface.

⚡ Bot Status: Online
🤖 Version: ${versionInfo.fullVersion}
👤 Profile: ${profileType}
📅 Test Time: ${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC

If you see this note, Nostr integration is working correctly! ✅

#lightning #nostr #test`;

    // Parse relays
    const relays = parseRelays(relayString);

    // Publish test event
    const result = await publishEvent(nsec, testMessage, relays, [
      ['t', 'lightning'],
      ['t', 'nostr'],
      ['t', 'test'],
      ['t', 'admin']
    ]);

    return res.status(200).json({
      success: true,
      message: 'Test Nostr event published successfully',
      data: {
        eventId: result.eventId,
        publishedTo: result.publishedTo,
        totalRelays: result.totalRelays,
        relayResults: result.results,
        testTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Nostr test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Nostr test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Test API connectivity
 */
async function handleApiTest(req, res) {
  try {
    const ambossApiKey = process.env.AMBOSS_API_KEY;
    const communityId = process.env.COMMUNITY_ID;

    if (!ambossApiKey || !communityId) {
      return res.status(400).json({
        success: false,
        error: 'Amboss API credentials not configured',
        missing: {
          apiKey: !ambossApiKey,
          communityId: !communityId
        },
        timestamp: new Date().toISOString()
      });
    }

    // Test Amboss API
    const stats = await fetchCommunityStats(ambossApiKey, communityId);

    if (!stats) {
      throw new Error('Failed to fetch community statistics from Amboss API');
    }

    return res.status(200).json({
      success: true,
      message: 'API connectivity test successful',
      data: {
        amboss: {
          connected: true,
          memberCount: stats.memberCount,
          totalChannels: stats.totalChannels,
          totalCapacity: stats.totalCapacity
        },
        testTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API test error:', error);
    return res.status(500).json({
      success: false,
      error: 'API connectivity test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Comprehensive health check
 */
async function handleHealthCheck(req, res) {
  const healthResults = {
    timestamp: new Date().toISOString(),
    version: versionInfo.fullVersion,
    checks: {}
  };

  // Test Amboss API
  try {
    const ambossApiKey = process.env.AMBOSS_API_KEY;
    const communityId = process.env.COMMUNITY_ID;

    if (ambossApiKey && communityId) {
      const stats = await fetchCommunityStats(ambossApiKey, communityId);
      healthResults.checks.amboss = {
        status: stats ? 'healthy' : 'failed',
        details: stats ? 'API responding' : 'No data returned'
      };
    } else {
      healthResults.checks.amboss = {
        status: 'not_configured',
        details: 'Missing API key or community ID'
      };
    }
  } catch (error) {
    healthResults.checks.amboss = {
      status: 'error',
      details: error.message
    };
  }

  // Test Mempool.space API
  try {
    const blockData = await fetchBlockData();
    healthResults.checks.mempool = {
      status: blockData ? 'healthy' : 'failed',
      details: blockData ? `Block height: ${blockData.height}` : 'No block data returned'
    };
  } catch (error) {
    healthResults.checks.mempool = {
      status: 'error',
      details: error.message
    };
  }

  // Check Telegram configuration
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const validation = validateTelegramConfig(botToken, chatId);

    healthResults.checks.telegram = {
      status: validation.valid ? 'configured' : 'invalid',
      details: validation.valid ? 'Configuration valid' : validation.errors.join(', ')
    };
  } catch (error) {
    healthResults.checks.telegram = {
      status: 'error',
      details: error.message
    };
  }

  // Check Nostr configuration
  try {
    const nsec = process.env.NOSTR_NSEC;
    const relays = parseRelays(process.env.NOSTR_RELAYS);

    healthResults.checks.nostr = {
      status: nsec && nsec.startsWith('nsec1') ? 'configured' : 'invalid',
      details: `${relays.length} relays configured, key format: ${nsec ? (nsec.startsWith('nsec1') ? 'valid' : 'invalid') : 'missing'}`
    };
  } catch (error) {
    healthResults.checks.nostr = {
      status: 'error',
      details: error.message
    };
  }

  // Determine overall health
  const allChecks = Object.values(healthResults.checks);
  const hasErrors = allChecks.some(check => check.status === 'error');
  const hasFailures = allChecks.some(check => check.status === 'failed');

  const overallStatus = hasErrors ? 'error' : hasFailures ? 'degraded' : 'healthy';

  return res.status(200).json({
    success: true,
    message: 'Health check completed',
    data: {
      overall: overallStatus,
      ...healthResults
    },
    timestamp: new Date().toISOString()
  });
}