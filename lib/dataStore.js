/**
 * Data Storage Layer for Historical Statistics
 * Handles persistence of daily statistics for trend analysis
 */

const fs = require('fs').promises;
const path = require('path');

// Data directory configuration
const DATA_DIR = path.join(process.cwd(), 'data', 'historical');
const RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS || '400', 10);

/**
 * Ensure data directory exists
 */
async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
    throw error;
  }
}

/**
 * Generate filename for a given date
 * @param {Date} date - Date object
 * @returns {string} Filename in format YYYY-MM-DD.json
 */
function getFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.json`;
}

/**
 * Get file path for a given date
 * @param {Date} date - Date object
 * @returns {string} Full file path
 */
function getFilePath(date) {
  return path.join(DATA_DIR, getFilename(date));
}

/**
 * Store daily statistics
 * @param {Object} stats - Statistics object
 * @param {Date} date - Date for the statistics (defaults to now)
 * @returns {Promise<string>} Path to stored file
 */
async function storeStats(stats, date = new Date()) {
  try {
    await ensureDataDirectory();

    const filePath = getFilePath(date);

    // Prepare data structure
    const dataToStore = {
      timestamp: stats.timestamp || new Date().toISOString(),
      memberCount: stats.memberCount,
      totalChannels: stats.totalChannels,
      totalCapacity: stats.totalCapacity,
      blockHeight: stats.blockHeight || null,
      source: stats.source || 'Amboss.space',
      storedAt: new Date().toISOString()
    };

    // Write to file
    await fs.writeFile(filePath, JSON.stringify(dataToStore, null, 2), 'utf8');

    console.log(`Stored statistics for ${getFilename(date)}`);
    return filePath;

  } catch (error) {
    console.error('Error storing statistics:', error);
    throw error;
  }
}

/**
 * Load statistics for a specific date
 * @param {Date} date - Date to load
 * @returns {Promise<Object|null>} Statistics object or null if not found
 */
async function loadStats(date) {
  try {
    const filePath = getFilePath(date);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    console.error('Error loading statistics:', error);
    throw error;
  }
}

/**
 * Load statistics for a date range
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 * @returns {Promise<Array>} Array of statistics objects with dates
 */
async function loadStatsRange(startDate, endDate) {
  try {
    const results = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const stats = await loadStats(currentDate);
      if (stats) {
        results.push({
          date: getFilename(currentDate),
          ...stats
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  } catch (error) {
    console.error('Error loading statistics range:', error);
    throw error;
  }
}

/**
 * Get all available data files
 * @returns {Promise<Array>} Array of available dates (YYYY-MM-DD format)
 */
async function getAvailableDates() {
  try {
    await ensureDataDirectory();
    const files = await fs.readdir(DATA_DIR);

    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .sort();
  } catch (error) {
    console.error('Error getting available dates:', error);
    return [];
  }
}

/**
 * Clean up old data files beyond retention period
 * @returns {Promise<number>} Number of files deleted
 */
async function cleanupOldData() {
  try {
    await ensureDataDirectory();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const files = await fs.readdir(DATA_DIR);
    let deletedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const dateStr = file.replace('.json', '');
      const fileDate = new Date(dateStr);

      if (fileDate < cutoffDate) {
        const filePath = path.join(DATA_DIR, file);
        await fs.unlink(filePath);
        deletedCount++;
        console.log(`Deleted old data file: ${file}`);
      }
    }

    console.log(`Cleanup complete: ${deletedCount} files deleted`);
    return deletedCount;

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

/**
 * Get the most recent statistics
 * @returns {Promise<Object|null>} Most recent stats or null
 */
async function getLatestStats() {
  try {
    const dates = await getAvailableDates();
    if (dates.length === 0) return null;

    const latestDate = dates[dates.length - 1];
    const stats = await loadStats(new Date(latestDate));

    return stats ? { date: latestDate, ...stats } : null;
  } catch (error) {
    console.error('Error getting latest stats:', error);
    return null;
  }
}

/**
 * Get statistics for X days ago
 * @param {number} daysAgo - Number of days in the past
 * @returns {Promise<Object|null>} Statistics or null if not found
 */
async function getStatsFromDaysAgo(daysAgo) {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);

    const stats = await loadStats(targetDate);
    return stats ? { date: getFilename(targetDate), ...stats } : null;
  } catch (error) {
    console.error('Error getting stats from days ago:', error);
    return null;
  }
}

/**
 * Export data as CSV
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<string>} CSV formatted data
 */
async function exportToCSV(startDate, endDate) {
  try {
    const stats = await loadStatsRange(startDate, endDate);

    if (stats.length === 0) {
      return 'No data available for the specified date range';
    }

    // CSV headers
    const headers = [
      'Date',
      'Timestamp',
      'Member Count',
      'Total Channels',
      'Total Capacity (BTC)',
      'Block Height',
      'Source'
    ];

    // CSV rows
    const rows = stats.map(stat => [
      stat.date,
      stat.timestamp,
      stat.memberCount,
      stat.totalChannels,
      stat.totalCapacity,
      stat.blockHeight || '',
      stat.source
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
}

module.exports = {
  storeStats,
  loadStats,
  loadStatsRange,
  getAvailableDates,
  cleanupOldData,
  getLatestStats,
  getStatsFromDaysAgo,
  exportToCSV,
  RETENTION_DAYS,
  DATA_DIR
};