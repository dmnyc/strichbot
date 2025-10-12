/**
 * Cron Schedule Management Utilities
 * Handles dynamic schedule generation and validation
 */

const { query, queryOne } = require('./database');

/**
 * Convert time string to cron minute and hour
 * @param {string} time - Time in HH:MM format
 * @returns {Object} Object with minute and hour
 */
function parseTime(time) {
  const [hour, minute] = time.split(':').map(num => parseInt(num, 10));
  return { minute, hour };
}

/**
 * Convert day of week string to cron day number
 * @param {string} day - Day name (sunday, monday, etc.)
 * @returns {number} Cron day number (0-6, Sunday=0)
 */
function dayToCronNumber(day) {
  const days = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };
  return days[day.toLowerCase()] || 0;
}

/**
 * Generate cron expression for daily schedule
 * @param {Object} schedule - Daily schedule configuration
 * @returns {string} Cron expression
 */
function generateDailyCron(schedule) {
  if (!schedule.enabled) return null;

  const { minute, hour } = parseTime(schedule.time);

  // If specific days are selected
  if (schedule.days && schedule.days.length > 0) {
    const cronDays = schedule.days.map(dayToCronNumber).join(',');
    return `${minute} ${hour} * * ${cronDays}`;
  }

  // Every day
  return `${minute} ${hour} * * *`;
}

/**
 * Generate cron expression for weekly schedule
 * @param {Object} schedule - Weekly schedule configuration
 * @returns {string} Cron expression
 */
function generateWeeklyCron(schedule) {
  if (!schedule.enabled) return null;

  const { minute, hour } = parseTime(schedule.time);
  const dayNumber = dayToCronNumber(schedule.dayOfWeek);

  return `${minute} ${hour} * * ${dayNumber}`;
}

/**
 * Generate cron expression for monthly schedule
 * @param {Object} schedule - Monthly schedule configuration
 * @returns {string} Cron expression
 */
function generateMonthlyCron(schedule) {
  if (!schedule.enabled) return null;

  const { minute, hour } = parseTime(schedule.time);

  if (schedule.dayOfMonth === 'last') {
    // Last day of month is complex in cron, use day 28 as safe alternative
    return `${minute} ${hour} 28 * *`;
  }

  const day = parseInt(schedule.dayOfMonth, 10);
  return `${minute} ${hour} ${day} * *`;
}

/**
 * Generate cron expression for annual schedule
 * @param {Object} schedule - Annual schedule configuration
 * @returns {string} Cron expression
 */
function generateAnnualCron(schedule) {
  if (!schedule.enabled) return null;

  const { minute, hour } = parseTime(schedule.time);

  // Parse date (YYYY-MM-DD or MM-DD format)
  let month, day;
  if (schedule.date) {
    const dateParts = schedule.date.split('-');
    if (dateParts.length === 3) {
      // YYYY-MM-DD format
      month = parseInt(dateParts[1], 10);
      day = parseInt(dateParts[2], 10);
    } else if (dateParts.length === 2) {
      // MM-DD format
      month = parseInt(dateParts[0], 10);
      day = parseInt(dateParts[1], 10);
    }
  } else {
    // Default to December 31st
    month = 12;
    day = 31;
  }

  return `${minute} ${hour} ${day} ${month} *`;
}

/**
 * Generate all cron schedules from configuration
 * @param {Object} config - Complete schedule configuration
 * @returns {Object} Generated cron schedules
 */
function generateCronSchedules(config) {
  const schedules = {};

  if (config.schedules) {
    // Daily posts
    if (config.schedules.daily) {
      const dailyCron = generateDailyCron(config.schedules.daily);
      if (dailyCron) {
        schedules.daily = {
          nostr: config.schedules.daily.platforms?.nostr?.enabled ? dailyCron : null,
          telegram: config.schedules.daily.platforms?.telegram?.enabled ? dailyCron : null
        };
      }
    }

    // Weekly reports
    if (config.schedules.weekly) {
      const weeklyCron = generateWeeklyCron(config.schedules.weekly);
      if (weeklyCron) {
        schedules.weekly = {
          nostr: config.schedules.weekly.platforms?.nostr?.enabled ? weeklyCron : null,
          telegram: config.schedules.weekly.platforms?.telegram?.enabled ? weeklyCron : null
        };
      }
    }

    // Monthly reports
    if (config.schedules.monthly) {
      const monthlyCron = generateMonthlyCron(config.schedules.monthly);
      if (monthlyCron) {
        schedules.monthly = {
          nostr: config.schedules.monthly.platforms?.nostr?.enabled ? monthlyCron : null,
          telegram: config.schedules.monthly.platforms?.telegram?.enabled ? monthlyCron : null
        };
      }
    }

    // Annual reports
    if (config.schedules.annual) {
      const annualCron = generateAnnualCron(config.schedules.annual);
      if (annualCron) {
        schedules.annual = {
          nostr: config.schedules.annual.platforms?.nostr?.enabled ? annualCron : null,
          telegram: config.schedules.annual.platforms?.telegram?.enabled ? annualCron : null
        };
      }
    }
  }

  return schedules;
}

/**
 * Validate cron expression
 * @param {string} cronExpression - Cron expression to validate
 * @returns {boolean} Whether the expression is valid
 */
function validateCronExpression(cronExpression) {
  if (!cronExpression || typeof cronExpression !== 'string') return false;

  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, day, month, dayOfWeek] = parts;

  // Basic validation (could be more comprehensive)
  const isValidRange = (value, min, max) => {
    if (value === '*') return true;
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= min && num <= max;
  };

  return (
    isValidRange(minute, 0, 59) &&
    isValidRange(hour, 0, 23) &&
    isValidRange(day, 1, 31) &&
    isValidRange(month, 1, 12) &&
    isValidRange(dayOfWeek, 0, 6)
  );
}

/**
 * Check for schedule conflicts (same time on same platform)
 * @param {Object} schedules - Generated schedules
 * @returns {Array} Array of conflicts found
 */
function checkScheduleConflicts(schedules) {
  const conflicts = [];
  const timeSlots = new Map();

  Object.entries(schedules).forEach(([type, schedule]) => {
    Object.entries(schedule).forEach(([platform, cron]) => {
      if (cron) {
        const key = `${platform}-${cron}`;
        if (timeSlots.has(key)) {
          conflicts.push({
            time: cron,
            platform,
            conflicting: [timeSlots.get(key), type]
          });
        } else {
          timeSlots.set(key, type);
        }
      }
    });
  });

  return conflicts;
}

/**
 * Generate Vercel cron configuration
 * @param {Object} schedules - Generated cron schedules
 * @returns {Array} Array of Vercel cron job configurations
 */
function generateVercelCronConfig(schedules) {
  const cronJobs = [
    // Always include API key check
    {
      path: '/api/check-api-key',
      schedule: '0 9 * * *'
    }
  ];

  // Add dynamic schedules
  Object.entries(schedules).forEach(([type, schedule]) => {
    if (schedule.nostr) {
      cronJobs.push({
        path: type === 'daily' ? '/api/post-stats' : `/api/${type}-report`,
        schedule: schedule.nostr
      });
    }

    if (schedule.telegram && type !== 'daily') {
      // For daily posts, telegram uses same endpoint but different time
      cronJobs.push({
        path: type === 'daily' ? '/api/telegram-post' : `/api/${type}-report`,
        schedule: schedule.telegram
      });
    } else if (schedule.telegram && type === 'daily') {
      // Daily telegram has its own endpoint
      cronJobs.push({
        path: '/api/telegram-post',
        schedule: schedule.telegram
      });
    }
  });

  return cronJobs;
}

/**
 * Update vercel.json with new cron schedules
 * Note: In serverless environment, this cannot update the actual file
 * Returns the suggested configuration for manual update
 * @param {Array} cronJobs - Array of cron job configurations
 * @returns {Promise<boolean>} Success status (always false in serverless)
 */
async function updateVercelConfig(cronJobs) {
  console.log('Vercel config update requested (manual update required in serverless)');
  console.log('Suggested cron configuration:', JSON.stringify(cronJobs, null, 2));
  return false;
}

/**
 * Load current schedule configuration
 * @returns {Promise<Object>} Current configuration or default
 */
async function loadScheduleConfig() {
  try {
    const row = await queryOne(
      'SELECT config FROM schedule_config WHERE id = 1'
    );

    if (row && row.config) {
      return typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
    }

    const defaultConfig = {
      categories: {
        daily: true,
        weekly: false,
        monthly: false,
        annual: false
      }
    };

    await saveScheduleConfig(defaultConfig);
    return defaultConfig;

  } catch (error) {
    console.error('Error loading schedule config:', error);
    throw error;
  }
}

/**
 * Save schedule configuration
 * @param {Object} config - Configuration to save
 * @returns {Promise<boolean>} Success status
 */
async function saveScheduleConfig(config) {
  try {
    const configJson = JSON.stringify(config);

    await query(
      `INSERT INTO schedule_config (id, config, updated_at)
       VALUES (1, ?, NOW())
       ON DUPLICATE KEY UPDATE
       config = VALUES(config),
       updated_at = NOW()`,
      [configJson]
    );

    return true;
  } catch (error) {
    console.error('Error saving schedule configuration:', error);
    return false;
  }
}

module.exports = {
  parseTime,
  dayToCronNumber,
  generateDailyCron,
  generateWeeklyCron,
  generateMonthlyCron,
  generateAnnualCron,
  generateCronSchedules,
  validateCronExpression,
  checkScheduleConflicts,
  generateVercelCronConfig,
  updateVercelConfig,
  loadScheduleConfig,
  saveScheduleConfig
};