/**
 * Trend Analysis System
 * Statistical analysis and trend calculations for historical data
 */

const { getStatsFromDaysAgo, getLatestStats, loadStatsRange } = require('./dataStore');

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change (can be negative)
 */
function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate absolute change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Absolute change (can be negative)
 */
function calculateAbsoluteChange(current, previous) {
  return current - previous;
}

/**
 * Get trend indicator emoji based on percentage change
 * @param {number} percentageChange - Percentage change
 * @returns {string} Emoji indicator
 */
function getTrendIndicator(percentageChange) {
  if (percentageChange > 5) return '🚀'; // Significant growth
  if (percentageChange > 0) return '📈'; // Growth
  if (percentageChange < -5) return '📉'; // Significant decline
  if (percentageChange < 0) return '📊'; // Slight decline
  return '➡️'; // No change
}

/**
 * Format number with commas and appropriate decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number
 */
function formatNumber(value, decimals = 0) {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format percentage change for display
 * @param {number} change - Percentage change
 * @returns {string} Formatted percentage with sign
 */
function formatPercentageChange(change) {
  if (isNaN(change)) return 'N/A';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Analyze trends between current and previous statistics
 * @param {Object} current - Current statistics
 * @param {Object} previous - Previous statistics
 * @returns {Object} Trend analysis results
 */
function analyzeTrends(current, previous) {
  if (!current || !previous) {
    return {
      available: false,
      reason: !current ? 'No current data' : 'No previous data'
    };
  }

  const analysis = {
    available: true,
    period: {
      current: current.date || 'current',
      previous: previous.date || 'previous'
    },
    members: {
      current: current.memberCount,
      previous: previous.memberCount,
      absolute: calculateAbsoluteChange(current.memberCount, previous.memberCount),
      percentage: calculatePercentageChange(current.memberCount, previous.memberCount)
    },
    channels: {
      current: current.totalChannels,
      previous: previous.totalChannels,
      absolute: calculateAbsoluteChange(current.totalChannels, previous.totalChannels),
      percentage: calculatePercentageChange(current.totalChannels, previous.totalChannels)
    },
    capacity: {
      current: current.totalCapacity,
      previous: previous.totalCapacity,
      absolute: calculateAbsoluteChange(current.totalCapacity, previous.totalCapacity),
      percentage: calculatePercentageChange(current.totalCapacity, previous.totalCapacity)
    }
  };

  // Add trend indicators
  analysis.members.indicator = getTrendIndicator(analysis.members.percentage);
  analysis.channels.indicator = getTrendIndicator(analysis.channels.percentage);
  analysis.capacity.indicator = getTrendIndicator(analysis.capacity.percentage);

  return analysis;
}

/**
 * Generate weekly trend report
 * @returns {Promise<Object>} Weekly trend analysis
 */
async function generateWeeklyReport() {
  try {
    console.log('Generating weekly trend report...');

    const current = await getLatestStats();
    const weekAgo = await getStatsFromDaysAgo(7);

    const analysis = analyzeTrends(current, weekAgo);

    return {
      type: 'weekly',
      period: '7 days',
      generated: new Date().toISOString(),
      analysis,
      success: true
    };

  } catch (error) {
    console.error('Error generating weekly report:', error);
    return {
      type: 'weekly',
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate monthly trend report
 * @returns {Promise<Object>} Monthly trend analysis
 */
async function generateMonthlyReport() {
  try {
    console.log('Generating monthly trend report...');

    const current = await getLatestStats();
    const monthAgo = await getStatsFromDaysAgo(30);

    const analysis = analyzeTrends(current, monthAgo);

    return {
      type: 'monthly',
      period: '30 days',
      generated: new Date().toISOString(),
      analysis,
      success: true
    };

  } catch (error) {
    console.error('Error generating monthly report:', error);
    return {
      type: 'monthly',
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate annual trend report
 * @returns {Promise<Object>} Annual trend analysis
 */
async function generateAnnualReport() {
  try {
    console.log('Generating annual trend report...');

    const current = await getLatestStats();
    const yearAgo = await getStatsFromDaysAgo(365);

    const analysis = analyzeTrends(current, yearAgo);

    return {
      type: 'annual',
      period: '365 days',
      generated: new Date().toISOString(),
      analysis,
      success: true
    };

  } catch (error) {
    console.error('Error generating annual report:', error);
    return {
      type: 'annual',
      success: false,
      error: error.message
    };
  }
}

/**
 * Format trend report for Nostr
 * @param {Object} report - Report object from generate functions
 * @returns {string} Formatted message for Nostr
 */
function formatTrendReportForNostr(report) {
  if (!report.success) {
    return `📊 Nodestrich ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report

❌ Unable to generate report: ${report.error}

🤖 StrichBot ♾️⚡

#lightning #nostr #trends`;
  }

  if (!report.analysis.available) {
    return `📊 Nodestrich ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report

📈 Insufficient historical data for ${report.period} comparison
${report.analysis.reason}

🤖 StrichBot ♾️⚡

#lightning #nostr #trends`;
  }

  const { analysis } = report;
  const reportTitle = report.type.charAt(0).toUpperCase() + report.type.slice(1);

  return `📊 Nodestrich ${reportTitle} Report 📊
${report.period} comparison

👥 Members: ${formatNumber(analysis.members.current)} (${formatPercentageChange(analysis.members.percentage)}) ${analysis.members.indicator}
🔗 Channels: ${formatNumber(analysis.channels.current)} (${formatPercentageChange(analysis.channels.percentage)}) ${analysis.channels.indicator}
🪙 Capacity: ${formatNumber(analysis.capacity.current, 2)} BTC (${formatPercentageChange(analysis.capacity.percentage)}) ${analysis.capacity.indicator}

📈 Growth Summary:
• Members: ${analysis.members.absolute >= 0 ? '+' : ''}${formatNumber(analysis.members.absolute)}
• Channels: ${analysis.channels.absolute >= 0 ? '+' : ''}${formatNumber(analysis.channels.absolute)}
• Capacity: ${analysis.capacity.absolute >= 0 ? '+' : ''}${formatNumber(analysis.capacity.absolute, 2)} BTC

${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC
🤖 StrichBot ♾️⚡

#lightning #nostr #trends`;
}

/**
 * Format trend report for Telegram
 * @param {Object} report - Report object from generate functions
 * @returns {string} Formatted message for Telegram
 */
function formatTrendReportForTelegram(report) {
  if (!report.success) {
    return `📊 <b>Nodestrich ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report</b>

❌ Unable to generate report: ${report.error}

🤖 StrichBot ♾️⚡`;
  }

  if (!report.analysis.available) {
    return `📊 <b>Nodestrich ${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report</b>

📈 Insufficient historical data for ${report.period} comparison
${report.analysis.reason}

🤖 StrichBot ♾️⚡`;
  }

  const { analysis } = report;
  const reportTitle = report.type.charAt(0).toUpperCase() + report.type.slice(1);

  return `📊 <b>Nodestrich ${reportTitle} Report</b> 📊
<i>${report.period} comparison</i>

👥 <b>Members:</b> ${formatNumber(analysis.members.current)} (${formatPercentageChange(analysis.members.percentage)}) ${analysis.members.indicator}
🔗 <b>Channels:</b> ${formatNumber(analysis.channels.current)} (${formatPercentageChange(analysis.channels.percentage)}) ${analysis.channels.indicator}
🪙 <b>Capacity:</b> ${formatNumber(analysis.capacity.current, 2)} BTC (${formatPercentageChange(analysis.capacity.percentage)}) ${analysis.capacity.indicator}

📈 <b>Growth Summary:</b>
• Members: ${analysis.members.absolute >= 0 ? '+' : ''}${formatNumber(analysis.members.absolute)}
• Channels: ${analysis.channels.absolute >= 0 ? '+' : ''}${formatNumber(analysis.channels.absolute)}
• Capacity: ${analysis.capacity.absolute >= 0 ? '+' : ''}${formatNumber(analysis.capacity.absolute, 2)} BTC

${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC
🤖 StrichBot ♾️⚡`;
}

/**
 * Get growth summary for a specific metric
 * @param {Object} metricAnalysis - Analysis for a specific metric
 * @returns {string} Growth summary description
 */
function getGrowthSummary(metricAnalysis) {
  const { percentage, absolute } = metricAnalysis;

  if (percentage > 10) return `Strong growth (+${absolute})`;
  if (percentage > 5) return `Good growth (+${absolute})`;
  if (percentage > 0) return `Slight growth (+${absolute})`;
  if (percentage === 0) return 'No change';
  if (percentage > -5) return `Slight decline (${absolute})`;
  if (percentage > -10) return `Moderate decline (${absolute})`;
  return `Significant decline (${absolute})`;
}

module.exports = {
  calculatePercentageChange,
  calculateAbsoluteChange,
  getTrendIndicator,
  formatNumber,
  formatPercentageChange,
  analyzeTrends,
  generateWeeklyReport,
  generateMonthlyReport,
  generateAnnualReport,
  formatTrendReportForNostr,
  formatTrendReportForTelegram,
  getGrowthSummary
};