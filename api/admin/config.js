/**
 * Admin Configuration API endpoint
 * Handles getting and setting bot configuration
 */

const { loadScheduleConfig, saveScheduleConfig } = require('../../lib/scheduler');
const { securityMiddleware, setSecurityHeaders } = require('../../lib/security');

// Optional version info - fallback if file doesn't exist
let versionInfo;
try {
  versionInfo = require('../../lib/version');
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
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      return res.status(200).end();
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

    console.log(`StrichBot v${versionInfo.fullVersion}: Admin config access (IP: ${req.headers['x-forwarded-for'] || req.connection?.remoteAddress})`);

    if (req.method === 'GET') {
      // Get current configuration
      try {
        const config = await loadScheduleConfig();

        // Also include current environment status
        const envStatus = {
          hasAmbossKey: !!process.env.AMBOSS_API_KEY,
          hasCommunityId: !!process.env.COMMUNITY_ID,
          hasNostrKey: !!process.env.NOSTR_NSEC,
          hasTelegramBot: !!process.env.TELEGRAM_BOT_TOKEN,
          hasTelegramChat: !!process.env.TELEGRAM_CHAT_ID,
          apiKeyExpiry: process.env.AMBOSS_API_KEY_EXPIRY_DATE || null,
          warningDays: process.env.API_KEY_WARNING_DAYS || '7,3,1',
          retentionDays: process.env.DATA_RETENTION_DAYS || '400'
        };

        return res.status(200).json({
          success: true,
          data: {
            ...config,
            environment: envStatus
          },
          version: versionInfo.fullVersion,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error loading configuration:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to load configuration',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }

    } else if (req.method === 'POST') {
      // Update configuration
      try {
        const { schedules, apiKey } = req.body;

        let updateCount = 0;

        // Update schedule configuration if provided
        if (schedules) {
          const success = await saveScheduleConfig({ schedules });
          if (success) {
            updateCount++;
            console.log('Schedule configuration updated');
          } else {
            throw new Error('Failed to save schedule configuration');
          }
        }

        // Note: API key configuration would typically update environment variables
        // In a serverless environment, this might require deployment or external configuration
        if (apiKey) {
          console.log('API key configuration received (environment variables need manual update)');
          // This would typically trigger an environment variable update
          updateCount++;
        }

        return res.status(200).json({
          success: true,
          message: `Configuration updated (${updateCount} sections)`,
          updated: {
            schedules: !!schedules,
            apiKey: !!apiKey
          },
          version: versionInfo.fullVersion,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error updating configuration:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update configuration',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowed: ['GET', 'POST'],
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error in admin config endpoint:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}