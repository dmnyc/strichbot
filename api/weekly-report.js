/**
 * Vercel serverless function to generate and post weekly trend reports
 * This function is triggered by a cron job
 */

const { generateWeeklyReport, formatTrendReportForNostr, formatTrendReportForTelegram } = require('../lib/trendAnalysis');
const { publishEvent, parseRelays } = require('../lib/nostr');
const { sendMessage, validateTelegramConfig } = require('../lib/telegram');
const { securityMiddleware, setSecurityHeaders } = require('../lib/security');

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
    console.log(`StrichBot v${versionInfo.fullVersion}: Starting weekly report generation (${authStatus}, IP: ${securityCheck.clientIp})`);

    // Get environment variables
    const nsec = process.env.NOSTR_NSEC;
    const relayString = process.env.NOSTR_RELAYS;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    // Check if reports are enabled
    const weeklyReportEnabled = process.env.WEEKLY_REPORT_ENABLED !== 'false';
    const nostrEnabled = process.env.WEEKLY_REPORT_NOSTR !== 'false';
    const telegramEnabled = process.env.WEEKLY_REPORT_TELEGRAM !== 'false';

    if (!weeklyReportEnabled) {
      console.log('Weekly reports are disabled');
      return res.status(200).json({
        success: true,
        message: 'Weekly reports are disabled',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Weekly report configuration:', {
      nostrEnabled,
      telegramEnabled,
      hasNostrConfig: !!(nsec && relayString),
      hasTelegramConfig: !!(telegramBotToken && telegramChatId)
    });

    // Generate the weekly report
    console.log('Generating weekly trend report...');
    const report = await generateWeeklyReport();

    if (!report.success) {
      console.error('Failed to generate weekly report:', report.error);
      return res.status(500).json({
        success: false,
        error: `Failed to generate weekly report: ${report.error}`,
        timestamp: new Date().toISOString()
      });
    }

    console.log('Weekly report generated successfully:', {
      available: report.analysis.available,
      hasData: report.analysis.available ? 'yes' : 'no'
    });

    const results = {
      nostr: { enabled: false, sent: false },
      telegram: { enabled: false, sent: false }
    };

    // Post to Nostr if enabled and configured
    if (nostrEnabled && nsec && relayString) {
      try {
        console.log('Posting weekly report to Nostr...');

        if (!nsec.startsWith('nsec1')) {
          throw new Error('NOSTR_NSEC must be in nsec1 format');
        }

        const nostrMessage = formatTrendReportForNostr(report);
        const relays = parseRelays(relayString);
        const tags = [
          ['t', 'lightning'],
          ['t', 'nostr'],
          ['t', 'trends'],
          ['t', 'weekly']
        ];

        const nostrResult = await publishEvent(nsec, nostrMessage, relays, tags);

        console.log('Weekly report posted to Nostr successfully:', {
          eventId: nostrResult.eventId,
          publishedTo: nostrResult.publishedTo
        });

        results.nostr = {
          enabled: true,
          sent: true,
          eventId: nostrResult.eventId,
          publishedTo: nostrResult.publishedTo,
          totalRelays: nostrResult.totalRelays
        };

      } catch (nostrError) {
        console.error('Failed to post weekly report to Nostr:', nostrError);
        results.nostr = {
          enabled: true,
          sent: false,
          error: nostrError.message
        };
      }
    } else {
      console.log('Nostr posting disabled or not configured for weekly reports');
      results.nostr.enabled = false;
    }

    // Post to Telegram if enabled and configured
    if (telegramEnabled && telegramBotToken && telegramChatId) {
      try {
        console.log('Posting weekly report to Telegram...');

        // Validate Telegram configuration
        const telegramValidation = validateTelegramConfig(telegramBotToken, telegramChatId);
        if (!telegramValidation.valid) {
          throw new Error(`Invalid Telegram configuration: ${telegramValidation.errors.join(', ')}`);
        }

        const telegramMessage = formatTrendReportForTelegram(report);
        const telegramResult = await sendMessage(telegramBotToken, telegramChatId, telegramMessage, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });

        console.log('Weekly report posted to Telegram successfully:', {
          messageId: telegramResult.messageId
        });

        results.telegram = {
          enabled: true,
          sent: true,
          messageId: telegramResult.messageId,
          chatId: telegramResult.chatId
        };

      } catch (telegramError) {
        console.error('Failed to post weekly report to Telegram:', telegramError);
        results.telegram = {
          enabled: true,
          sent: false,
          error: telegramError.message
        };
      }
    } else {
      console.log('Telegram posting disabled or not configured for weekly reports');
      results.telegram.enabled = false;
    }

    // Determine overall success
    const overallSuccess =
      (results.nostr.enabled ? results.nostr.sent : true) &&
      (results.telegram.enabled ? results.telegram.sent : true);

    const message = overallSuccess
      ? 'Weekly report generated and posted successfully'
      : 'Weekly report generated but some posting failed';

    return res.status(overallSuccess ? 200 : 207).json({
      success: overallSuccess,
      message,
      data: {
        report: {
          type: report.type,
          period: report.period,
          generated: report.generated,
          dataAvailable: report.analysis.available
        },
        results,
        version: versionInfo.fullVersion
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in weekly report generation:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}