/**
 * Data Storage Layer for Historical Statistics
 * Handles persistence of daily statistics for trend analysis
 */

const { query, queryOne, insert } = require('./database');

const RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS || '400', 10);

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Store daily statistics
 * @param {Object} stats - Statistics object
 * @param {Date} date - Date for the statistics (defaults to now)
 * @returns {Promise<string>} Path to stored file
 */
async function storeStats(stats, date = new Date()) {
  try {
    const dateStr = formatDate(date);

    const dataToInsert = {
      date: dateStr,
      timestamp: stats.timestamp || new Date().toISOString(),
      member_count: stats.memberCount,
      total_channels: stats.totalChannels,
      total_capacity: stats.totalCapacity,
      block_height: stats.blockHeight || null,
      source: stats.source || 'Amboss.space'
    };

    await query(
      `INSERT INTO historical_stats (date, timestamp, member_count, total_channels, total_capacity, block_height, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       timestamp = VALUES(timestamp),
       member_count = VALUES(member_count),
       total_channels = VALUES(total_channels),
       total_capacity = VALUES(total_capacity),
       block_height = VALUES(block_height),
       source = VALUES(source)`,
      [
        dataToInsert.date,
        dataToInsert.timestamp,
        dataToInsert.member_count,
        dataToInsert.total_channels,
        dataToInsert.total_capacity,
        dataToInsert.block_height,
        dataToInsert.source
      ]
    );

    console.log(`Stored statistics for ${dateStr}`);
    return dateStr;

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
    const dateStr = formatDate(date);
    const row = await queryOne(
      'SELECT * FROM historical_stats WHERE date = ?',
      [dateStr]
    );

    if (!row) return null;

    return {
      timestamp: row.timestamp,
      memberCount: row.member_count,
      totalChannels: row.total_channels,
      totalCapacity: row.total_capacity,
      blockHeight: row.block_height,
      source: row.source
    };
  } catch (error) {
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
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const rows = await query(
      'SELECT * FROM historical_stats WHERE date BETWEEN ? AND ? ORDER BY date ASC',
      [startStr, endStr]
    );

    return rows.map(row => ({
      date: row.date,
      timestamp: row.timestamp,
      memberCount: row.member_count,
      totalChannels: row.total_channels,
      totalCapacity: row.total_capacity,
      blockHeight: row.block_height,
      source: row.source
    }));
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
    const rows = await query(
      'SELECT date FROM historical_stats ORDER BY date ASC'
    );
    return rows.map(row => row.date);
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffStr = formatDate(cutoffDate);

    const result = await query(
      'DELETE FROM historical_stats WHERE date < ?',
      [cutoffStr]
    );

    const deletedCount = result.affectedRows || 0;
    console.log(`Cleanup complete: ${deletedCount} records deleted`);
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
    const row = await queryOne(
      'SELECT * FROM historical_stats ORDER BY date DESC LIMIT 1'
    );

    if (!row) return null;

    return {
      date: row.date,
      timestamp: row.TIMESTAMP || row.timestamp,
      memberCount: row.member_count,
      totalChannels: row.total_channels,
      totalCapacity: row.total_capacity,
      blockHeight: row.block_height,
      source: row.SOURCE || row.source
    };
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
    const dateStr = formatDate(targetDate);

    const row = await queryOne(
      'SELECT * FROM historical_stats WHERE date = ?',
      [dateStr]
    );

    if (!row) return null;

    return {
      date: row.date,
      timestamp: row.timestamp,
      memberCount: row.member_count,
      totalChannels: row.total_channels,
      totalCapacity: row.total_capacity,
      blockHeight: row.block_height,
      source: row.source
    };
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
  RETENTION_DAYS
};