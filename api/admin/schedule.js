/**
 * Admin Schedule Management API endpoint
 * Handles dynamic cron schedule updates
 */

const {
  loadScheduleConfig,
  saveScheduleConfig,
  generateCronSchedules,
  checkScheduleConflicts,
  generateVercelCronConfig,
  updateVercelConfig
} = require('../../lib/scheduler');
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

    console.log(`StrichBot v${versionInfo.fullVersion}: Admin schedule access (IP: ${req.headers['x-forwarded-for'] || req.connection?.remoteAddress})`);

    if (req.method === 'GET') {
      // Get current schedule and generated cron expressions
      try {
        const config = await loadScheduleConfig();
        const cronSchedules = generateCronSchedules(config);
        const conflicts = checkScheduleConflicts(cronSchedules);
        const vercelCrons = generateVercelCronConfig(cronSchedules);

        return res.status(200).json({
          success: true,
          data: {
            configuration: config,
            generated: {
              cronSchedules,
              vercelCrons,
              conflicts
            }
          },
          version: versionInfo.fullVersion,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error loading schedule:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to load schedule configuration',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }

    } else if (req.method === 'POST') {
      // Update schedule configuration
      try {
        const { schedules, updateVercel = false } = req.body;

        if (!schedules) {
          return res.status(400).json({
            success: false,
            error: 'Schedule configuration is required',
            timestamp: new Date().toISOString()
          });
        }

        console.log('Updating schedule configuration:', schedules);

        // Validate and generate new schedules
        const config = { schedules };
        const cronSchedules = generateCronSchedules(config);
        const conflicts = checkScheduleConflicts(cronSchedules);

        // Warn about conflicts but don't prevent saving
        if (conflicts.length > 0) {
          console.warn('Schedule conflicts detected:', conflicts);
        }

        const saved = await saveScheduleConfig(config);

        if (!saved) {
          return res.status(500).json({
            success: false,
            error: 'Failed to save schedule configuration to database',
            timestamp: new Date().toISOString()
          });
        }

        console.log('Schedule configuration saved to database successfully');

        const vercelCrons = generateVercelCronConfig(cronSchedules);

        return res.status(200).json({
          success: true,
          message: 'Schedule configuration saved successfully',
          data: {
            saved: true,
            conflicts: conflicts.length,
            conflictDetails: conflicts,
            vercel: {
              updated: false,
              note: 'Update vercel.json manually and redeploy',
              requiresDeployment: true,
              suggestedConfig: vercelCrons
            },
            generated: {
              cronSchedules,
              totalJobs: Object.keys(cronSchedules).length
            }
          },
          version: versionInfo.fullVersion,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error updating schedule:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update schedule configuration',
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
    console.error('Error in admin schedule endpoint:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}