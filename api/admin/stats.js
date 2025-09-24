/**
 * Admin Statistics and Data Management API endpoint
 * Handles historical data operations, exports, and cleanup
 */

import {
  getAvailableDates,
  getLatestStats,
  exportToCSV,
  cleanupOldData,
  loadStatsRange,
  RETENTION_DAYS
} from '../../lib/dataStore.js';
import { securityMiddleware, setSecurityHeaders } from '../../lib/security.js';

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
    const adminToken = req.headers['x-api-key'] || process.env.ADMIN_TOKEN;
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid admin token',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`StrichBot v${versionInfo.fullVersion}: Admin stats access (IP: ${req.headers['x-forwarded-for'] || req.connection?.remoteAddress})`);

    if (req.method === 'GET') {
      // Get statistics overview
      try {
        const availableDates = await getAvailableDates();
        const latestStats = await getLatestStats();

        const dataRange = availableDates.length > 0
          ? `${availableDates[0]} to ${availableDates[availableDates.length - 1]}`
          : 'No data available';

        return res.status(200).json({
          success: true,
          data: {
            totalPoints: availableDates.length,
            dataRange,
            retentionDays: RETENTION_DAYS,
            availableDates: availableDates.slice(-30), // Last 30 days for UI
            latestStats: latestStats ? {
              date: latestStats.date,
              memberCount: latestStats.memberCount,
              totalChannels: latestStats.totalChannels,
              totalCapacity: latestStats.totalCapacity,
              blockHeight: latestStats.blockHeight
            } : null,
            lastPost: latestStats?.timestamp || 'Never'
          },
          version: versionInfo.fullVersion,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error loading statistics overview:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to load statistics',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }

    } else if (req.method === 'POST') {
      // Handle various data operations
      try {
        const { action, startDate, endDate } = req.body;

        if (!action) {
          return res.status(400).json({
            success: false,
            error: 'Action parameter is required',
            timestamp: new Date().toISOString()
          });
        }

        switch (action) {
          case 'export':
            return await handleExport(req, res, startDate, endDate);

          case 'cleanup':
            return await handleCleanup(req, res);

          case 'range':
            return await handleRange(req, res, startDate, endDate);

          default:
            return res.status(400).json({
              success: false,
              error: `Unknown action: ${action}`,
              supportedActions: ['export', 'cleanup', 'range'],
              timestamp: new Date().toISOString()
            });
        }

      } catch (error) {
        console.error('Error in stats operation:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to perform statistics operation',
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
    console.error('Error in admin stats endpoint:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle data export to CSV
 */
async function handleExport(req, res, startDate, endDate) {
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Both startDate and endDate are required for export',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log(`Exporting data from ${startDate} to ${endDate}`);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format.');
    }

    if (start > end) {
      throw new Error('Start date must be before end date');
    }

    const csvData = await exportToCSV(start, end);

    if (!csvData || csvData.startsWith('No data available')) {
      return res.status(404).json({
        success: false,
        error: 'No data available for the specified date range',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Data exported successfully',
      data: {
        csv: csvData,
        dateRange: `${startDate} to ${endDate}`,
        filename: `strichbot-data-${startDate}-to-${endDate}.csv`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({
      success: false,
      error: 'Export failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle data cleanup
 */
async function handleCleanup(req, res) {
  try {
    console.log('Starting data cleanup operation');

    const deletedCount = await cleanupOldData();

    return res.status(200).json({
      success: true,
      message: 'Data cleanup completed successfully',
      data: {
        deletedCount,
        retentionDays: RETENTION_DAYS
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Cleanup operation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle date range data retrieval
 */
async function handleRange(req, res, startDate, endDate) {
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Both startDate and endDate are required for range query',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format.');
    }

    const stats = await loadStatsRange(start, end);

    return res.status(200).json({
      success: true,
      message: 'Data range retrieved successfully',
      data: {
        stats,
        count: stats.length,
        dateRange: `${startDate} to ${endDate}`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Range query error:', error);
    return res.status(500).json({
      success: false,
      error: 'Range query failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}