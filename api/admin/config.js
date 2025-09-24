/**
 * Admin Configuration API endpoint
 * Handles getting and setting bot configuration
 */

import { loadScheduleConfig, saveScheduleConfig } from '../../lib/scheduler.js';
import { securityMiddleware, setSecurityHeaders } from '../../lib/security.js';
import { getApiKeyConfig, saveApiKeyConfig } from '../../lib/apiKeyConfig.js';

const versionInfo = { fullVersion: '1.0.0' };

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
    const adminToken = req.headers['x-api-key'];
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
        console.log('[CONFIG] Loading schedule config...');
        const config = await loadScheduleConfig();
        console.log('[CONFIG] Schedule config loaded successfully');

        const apiKeyConfig = await getApiKeyConfig();

        // Also include current environment status
        const envStatus = {
          hasAmbossKey: !!process.env.AMBOSS_API_KEY,
          hasCommunityId: !!process.env.COMMUNITY_ID,
          hasNostrKey: !!process.env.NOSTR_NSEC,
          hasTelegramBot: !!process.env.TELEGRAM_BOT_TOKEN,
          hasTelegramChat: !!process.env.TELEGRAM_CHAT_ID,
          apiKeyExpiry: apiKeyConfig.expiryDate,
          warningDays: apiKeyConfig.warningDays,
          retentionDays: process.env.DATA_RETENTION_DAYS || '400'
        };

        console.log('[CONFIG] Preparing response...');
        const response = {
          success: true,
          data: {
            ...config,
            environment: envStatus
          },
          version: versionInfo.fullVersion,
          timestamp: new Date().toISOString()
        };
        console.log('[CONFIG] Sending response...');
        return res.status(200).json(response);

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

        // Update API key configuration if provided
        if (apiKey) {
          const success = await saveApiKeyConfig(apiKey.expiryDate, apiKey.warningDays);
          if (success) {
            updateCount++;
            console.log('API key configuration updated in database');
          } else {
            throw new Error('Failed to save API key configuration');
          }
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