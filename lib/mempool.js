/**
 * Mempool.space API client for fetching Bitcoin block data
 */

const MEMPOOL_API_URL = 'https://mempool.space/api';

/**
 * Fetch current Bitcoin block height from Mempool.space
 * @returns {Promise<number|null>} Current block height or null if failed
 */
async function fetchBlockHeight() {
  try {
    const response = await fetch(`${MEMPOOL_API_URL}/blocks/tip/height`);

    if (!response.ok) {
      throw new Error(`Mempool API error: ${response.status} ${response.statusText}`);
    }

    const blockHeight = await response.text();
    const height = parseInt(blockHeight.trim(), 10);

    if (isNaN(height)) {
      throw new Error('Invalid block height received from Mempool API');
    }

    console.log(`Fetched Bitcoin block height: ${height}`);
    return height;

  } catch (error) {
    console.error('Error fetching block height from Mempool.space:', error);
    return null;
  }
}

/**
 * Fetch block data including height and timestamp
 * @returns {Promise<Object|null>} Block data or null if failed
 */
async function fetchBlockData() {
  try {
    // First get the block height
    const height = await fetchBlockHeight();
    if (height === null) {
      return null;
    }

    // Get current time in UTC
    const timestamp = new Date().toISOString();

    return {
      height,
      timestamp,
      source: 'Mempool.space'
    };

  } catch (error) {
    console.error('Error fetching block data:', error);
    return null;
  }
}

/**
 * Format block height for display
 * @param {number} height - Block height
 * @returns {string} Formatted height with commas
 */
function formatBlockHeight(height) {
  if (typeof height !== 'number' || isNaN(height)) {
    return 'Unknown';
  }
  return height.toLocaleString();
}

module.exports = {
  fetchBlockHeight,
  fetchBlockData,
  formatBlockHeight
};