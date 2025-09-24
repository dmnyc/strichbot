/**
 * Vercel serverless function to check Amboss API key expiration
 * This function is triggered by a daily cron job
 */

import { setSecurityHeaders, securityMiddleware } from '../lib/security.js';
import { getApiKeyConfig } from '../lib/apiKeyConfig.js';

const versionInfo = { fullVersion: '1.0.0' };

export default async function handler(req, res) {
  const { checkKeyExpiration, sendExpirationWarning, shouldSendNotification, loadNotificationState } = await import('../lib/keyMonitor.js');
  const { validateTelegramConfig } = await import('../lib/telegram.js');
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
    console.log(`StrichBot v${versionInfo.fullVersion}: Starting API key expiration check (${authStatus}, IP: ${securityCheck.clientIp})`);

    // Get API key config from database (with env var fallback)
    const apiKeyConfig = await getApiKeyConfig();
    const expiryDate = apiKeyConfig.expiryDate;
    const warningDaysStr = apiKeyConfig.warningDays;

    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    // Parse warning days
    const warningDays = warningDaysStr.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));

    console.log('API key expiration check configuration:', {
      hasExpiryDate: !!expiryDate,
      warningDays,
      hasTelegramConfig: !!(telegramBotToken && telegramChatId)
    });

    // Validate Telegram configuration
    const telegramValidation = validateTelegramConfig(telegramBotToken, telegramChatId);
    if (!telegramValidation.valid) {
      console.error('Telegram configuration invalid:', telegramValidation.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid Telegram configuration for admin notifications',
        details: telegramValidation.errors
      });
    }

    // Check if expiry date is configured
    if (!expiryDate) {
      console.log('No API key expiry date configured - check skipped');
      return res.status(200).json({
        success: true,
        message: 'No API key expiry date configured - monitoring disabled',
        timestamp: new Date().toISOString()
      });
    }

    // Check key expiration
    console.log('Checking API key expiration...');
    const checkResult = checkKeyExpiration(expiryDate, warningDays);

    if (checkResult.error) {
      console.error('Error checking key expiration:', checkResult.error);
      return res.status(400).json({
        success: false,
        error: `API key expiration check failed: ${checkResult.error}`,
        timestamp: new Date().toISOString()
      });
    }

    console.log('Key expiration check result:', {
      shouldWarn: checkResult.shouldWarn,
      daysUntilExpiry: checkResult.daysUntilExpiry,
      urgency: checkResult.urgency
    });

    // Load notification state to prevent duplicates
    const notificationState = loadNotificationState();

    // Check if we should send a notification
    if (checkResult.shouldWarn && shouldSendNotification(checkResult, notificationState)) {
      console.log('Sending API key expiration warning...');

      try {
        const warningResult = await sendExpirationWarning(telegramBotToken, telegramChatId, checkResult);

        console.log('API key expiration warning sent successfully');

        return res.status(200).json({
          success: true,
          message: 'API key expiration warning sent',
          data: {
            expiration: {
              daysUntilExpiry: checkResult.daysUntilExpiry,
              urgency: checkResult.urgency,
              expired: checkResult.expired || false
            },
            notification: {
              sent: true,
              messageId: warningResult.messageId,
              chatId: warningResult.chatId
            },
            version: versionInfo.fullVersion
          },
          timestamp: new Date().toISOString()
        });

      } catch (warningError) {
        console.error('Failed to send expiration warning:', warningError);
        return res.status(500).json({
          success: false,
          error: 'Failed to send expiration warning',
          details: warningError.message,
          timestamp: new Date().toISOString()
        });
      }

    } else {
      // No warning needed
      const reason = !checkResult.shouldWarn
        ? `API key is valid (${checkResult.daysUntilExpiry} days until expiry)`
        : 'Notification already sent today';

      console.log(`No warning needed: ${reason}`);

      return res.status(200).json({
        success: true,
        message: reason,
        data: {
          expiration: {
            daysUntilExpiry: checkResult.daysUntilExpiry,
            urgency: checkResult.urgency || 'none',
            expired: checkResult.expired || false
          },
          notification: {
            sent: false,
            reason
          },
          version: versionInfo.fullVersion
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error in API key expiration check:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}