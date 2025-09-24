/**
 * Unified Scheduler - Dynamic cron endpoint
 * Checks database schedule and executes appropriate posts
 */

import { setSecurityHeaders, securityMiddleware } from '../lib/security.js';
import { loadScheduleConfig } from '../lib/scheduler.js';

const versionInfo = { fullVersion: '1.0.0' };

/**
 * Check if current time matches a schedule
 */
function matchesSchedule(schedule, now) {
  if (!schedule || !schedule.enabled) return false;

  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentDay = now.getUTCDay(); // 0-6, Sunday=0
  const currentDate = now.getUTCDate();
  const currentMonth = now.getUTCMonth() + 1; // 0-11, so add 1

  const [schedHour, schedMinute] = schedule.time.split(':').map(Number);

  // Must match hour (minutes should be 00 for hourly cron)
  if (currentHour !== schedHour || currentMinute !== 0) return false;

  // Check schedule type-specific conditions
  if (schedule.days) {
    // Daily schedule - check day of week
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const allowedDays = schedule.days.map(d => dayMap[d]);
    if (!allowedDays.includes(currentDay)) return false;
  }

  if (schedule.dayOfWeek !== undefined) {
    // Weekly schedule - check specific day
    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const targetDay = dayMap[schedule.dayOfWeek.toLowerCase()];
    if (currentDay !== targetDay) return false;
  }

  if (schedule.dayOfMonth !== undefined) {
    // Monthly schedule - check day of month
    if (schedule.dayOfMonth === 'last') {
      const lastDay = new Date(now.getUTCFullYear(), currentMonth, 0).getUTCDate();
      if (currentDate !== lastDay) return false;
    } else {
      if (currentDate !== parseInt(schedule.dayOfMonth)) return false;
    }
  }

  if (schedule.date) {
    // Annual schedule - check month and day
    const dateParts = schedule.date.split('-');
    let targetMonth, targetDay;

    if (dateParts.length === 3) {
      targetMonth = parseInt(dateParts[1]);
      targetDay = parseInt(dateParts[2]);
    } else if (dateParts.length === 2) {
      targetMonth = parseInt(dateParts[0]);
      targetDay = parseInt(dateParts[1]);
    }

    if (currentMonth !== targetMonth || currentDate !== targetDay) return false;
  }

  return true;
}

/**
 * Execute the appropriate posting function
 */
async function executePost(type, platform) {
  console.log(`Executing ${type} post for ${platform}`);

  try {
    if (type === 'daily') {
      if (platform === 'nostr') {
        const { default: postStats } = await import('./post-stats.js');
        return { handler: postStats, type: 'nostr-daily' };
      } else if (platform === 'telegram') {
        const { default: telegramPost } = await import('./telegram-post.js');
        return { handler: telegramPost, type: 'telegram-daily' };
      }
    } else if (type === 'weekly') {
      const { default: weeklyReport } = await import('./weekly-report.js');
      return { handler: weeklyReport, type: 'weekly', platform };
    } else if (type === 'monthly') {
      const { default: monthlyReport } = await import('./monthly-report.js');
      return { handler: monthlyReport, type: 'monthly', platform };
    } else if (type === 'annual') {
      const { default: annualReport } = await import('./annual-report.js');
      return { handler: annualReport, type: 'annual', platform };
    }
  } catch (error) {
    console.error(`Error loading handler for ${type}/${platform}:`, error);
    throw error;
  }

  return null;
}

export default async function handler(req, res) {
  try {
    setSecurityHeaders(res);

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://strichbot.vercel.app');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cron-Secret');
      return res.status(200).end();
    }

    const securityCheck = securityMiddleware(req, res, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
      allowedMethods: ['GET', 'POST'],
      requireAuth: true
    });

    if (!securityCheck.allowed) {
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

    console.log(`StrichBot v${versionInfo.fullVersion}: Scheduler check running`);

    const config = await loadScheduleConfig();
    const now = new Date();
    const executions = [];

    console.log(`Current UTC time: ${now.toISOString()}`);

    // Check each schedule type
    for (const [type, schedule] of Object.entries(config.schedules || {})) {
      if (matchesSchedule(schedule, now)) {
        console.log(`Schedule matched: ${type}`);

        // Check which platforms are enabled
        if (schedule.platforms?.nostr?.enabled) {
          const result = await executePost(type, 'nostr');
          if (result) {
            await result.handler(req, res);
            executions.push({ type, platform: 'nostr', status: 'executed' });

            // Return after first execution to avoid multiple responses
            return;
          }
        }

        if (schedule.platforms?.telegram?.enabled) {
          const result = await executePost(type, 'telegram');
          if (result) {
            await result.handler(req, res);
            executions.push({ type, platform: 'telegram', status: 'executed' });

            // Return after first execution
            return;
          }
        }
      }
    }

    // No schedules matched
    console.log('No schedules matched current time');
    return res.status(200).json({
      success: true,
      message: 'Scheduler check completed - no posts scheduled for this time',
      checked: now.toISOString(),
      executions: executions.length > 0 ? executions : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduler error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}