/**
 * Nostr client for posting events to relays
 */

const { finalizeEvent, verifyEvent, getPublicKey, nip19 } = require('nostr-tools');
const { Relay } = require('nostr-tools/relay');
const { getStatsFromDaysAgo } = require('./dataStore');

/**
 * Create and publish a Nostr event
 * @param {string} nsec - Private key in nsec format
 * @param {string} content - Message content
 * @param {Array} relays - Array of relay URLs
 * @param {Array} tags - Optional tags for the event
 * @returns {Promise<Object>} Result of the publish operation
 */
async function publishEvent(nsec, content, relays, tags = []) {
  try {
    // Decode the private key from nsec format
    const { data: privateKey } = nip19.decode(nsec);
    const publicKey = getPublicKey(privateKey);

    // Create the event
    const event = {
      kind: 1, // Text note
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['t', 'lightning'],
        ['t', 'nostr'],
        ...tags
      ],
      content,
      pubkey: publicKey,
    };

    // Finalize (add id and sig)
    const finalizedEvent = finalizeEvent(event, privateKey);

    // Verify the event
    const isValid = verifyEvent(finalizedEvent);
    if (!isValid) {
      throw new Error('Invalid event signature');
    }

    // Publish to relays
    const results = [];
    const publishPromises = relays.map(async (relayUrl) => {
      try {
        console.log(`Connecting to relay: ${relayUrl}`);

        const relay = await Relay.connect(relayUrl);
        console.log(`Connected to ${relayUrl}`);

        await relay.publish(finalizedEvent);
        console.log(`Published to ${relayUrl}`);

        relay.close();

        return { relay: relayUrl, success: true };
      } catch (error) {
        console.error(`Failed to publish to ${relayUrl}:`, error.message);
        return { relay: relayUrl, success: false, error: error.message };
      }
    });

    const publishResults = await Promise.allSettled(publishPromises);

    for (const result of publishResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ success: false, error: result.reason.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      eventId: finalizedEvent.id,
      publicKey,
      publishedTo: successCount,
      totalRelays: relays.length,
      results,
      event: finalizedEvent
    };

  } catch (error) {
    console.error('Error publishing event:', error);
    throw error;
  }
}

/**
 * Format community statistics into a Nostr post
 * @param {Object} stats - Statistics object from Amboss
 * @param {Object} blockData - Bitcoin block data from Mempool.space
 * @returns {string} Formatted message for Nostr
 */
function formatStatsMessage(stats, blockData = null) {
  const { memberCount, totalChannels, totalCapacity, timestamp, source } = stats;

  // Format the capacity
  const capacityBTC = typeof totalCapacity === 'number' ? totalCapacity.toFixed(2) : totalCapacity;

  // Format numbers with commas
  const formattedMembers = memberCount.toLocaleString();
  const formattedChannels = totalChannels.toLocaleString();

  const message = `⚡ Nodestrich ♾️ Community Update ⚡

📊 Group Stats:

👥 Members: ${formattedMembers}
🔗 Channels: ${formattedChannels}
🪙 Capacity: ${capacityBTC} BTC

📈 Data from #Amboss

${blockData ? `Block Height: ${blockData.height}` : ''}
${new Date(timestamp).toISOString().replace('T', ' ').substring(0, 16)} UTC
Update powered by StrichBot ♾️🤖⚡

#lightning #nostr`;

  return message;
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
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change
 */
function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format community statistics with 7-day trends into a Nostr post
 * @param {Object} stats - Statistics object from Amboss
 * @param {Object} blockData - Bitcoin block data from Mempool.space
 * @returns {Promise<string>} Formatted message for Nostr
 */
async function formatWeeklyStatsMessage(stats, blockData = null) {
  const { memberCount, totalChannels, totalCapacity, timestamp, source } = stats;

  // Format the capacity
  const capacityBTC = typeof totalCapacity === 'number' ? totalCapacity.toFixed(2) : totalCapacity;

  // Format numbers with commas
  const formattedMembers = memberCount.toLocaleString();
  const formattedChannels = totalChannels.toLocaleString();

  // Get stats from 7 days ago for comparison
  let trendSection = '';
  try {
    const weekAgoStats = await getStatsFromDaysAgo(7);

    if (weekAgoStats) {
      // Calculate changes
      const memberChange = memberCount - weekAgoStats.memberCount;
      const memberPercentChange = calculatePercentageChange(memberCount, weekAgoStats.memberCount);
      const memberIndicator = getTrendIndicator(memberPercentChange);

      const channelChange = totalChannels - weekAgoStats.totalChannels;
      const channelPercentChange = calculatePercentageChange(totalChannels, weekAgoStats.totalChannels);
      const channelIndicator = getTrendIndicator(channelPercentChange);

      const capacityChange = totalCapacity - weekAgoStats.totalCapacity;
      const capacityPercentChange = calculatePercentageChange(totalCapacity, weekAgoStats.totalCapacity);
      const capacityIndicator = getTrendIndicator(capacityPercentChange);

      // Format changes with + or - sign
      const formattedMemberChange = memberChange >= 0 ? `+${memberChange}` : `${memberChange}`;
      const formattedChannelChange = channelChange >= 0 ? `+${channelChange.toLocaleString()}` : `${channelChange.toLocaleString()}`;
      const formattedCapacityChange = capacityChange >= 0 ? `+${capacityChange.toFixed(2)}` : `${capacityChange.toFixed(2)}`;
      const formattedMemberPercent = memberPercentChange >= 0 ? `+${memberPercentChange.toFixed(2)}` : `${memberPercentChange.toFixed(2)}`;
      const formattedChannelPercent = channelPercentChange >= 0 ? `+${channelPercentChange.toFixed(2)}` : `${channelPercentChange.toFixed(2)}`;
      const formattedCapacityPercent = capacityPercentChange >= 0 ? `+${capacityPercentChange.toFixed(2)}` : `${capacityPercentChange.toFixed(2)}`;

      trendSection = `
👥 Members: ${formattedMembers}
   7-day change: ${formattedMemberChange} (${formattedMemberPercent}%)

🔗 Channels: ${formattedChannels}
   7-day change: ${formattedChannelChange} (${formattedChannelPercent}%)

🪙 Capacity: ${capacityBTC} BTC
   7-day change: ${formattedCapacityChange} BTC (${formattedCapacityPercent}%)`;
    } else {
      // No historical data available, use simple format
      trendSection = `
👥 Members: ${formattedMembers}
🔗 Channels: ${formattedChannels}
🪙 Capacity: ${capacityBTC} BTC`;
    }
  } catch (error) {
    console.error('Error fetching trend data:', error);
    // Fallback to simple format on error
    trendSection = `
👥 Members: ${formattedMembers}
🔗 Channels: ${formattedChannels}
🪙 Capacity: ${capacityBTC} BTC`;
  }

  const message = `⚡ Nodestrich ♾️ Community Update ⚡

📊 Group Stats:
${trendSection}

📈 Data from Amboss.space

${blockData ? `Block Height: ${blockData.height}` : ''}
${new Date(timestamp).toISOString().replace('T', ' ').substring(0, 16)} UTC

Update powered by StrichBot ♾️🤖⚡

#lightning #nostr`;

  return message;
}

/**
 * Parse relay URLs from environment variable
 * @param {string} relayString - Comma-separated relay URLs
 * @returns {Array} Array of relay URLs
 */
function parseRelays(relayString) {
  if (!relayString) {
    return [
      'wss://relay.damus.io',
      'wss://relay.snort.social',
      'wss://nostr.wine',
      'wss://nos.lol',
      'wss://nostr.land',
      'wss://nostr.bitcoiner.social',
      'wss://relay.primal.net'
    ];
  }

  return relayString.split(',').map(url => url.trim()).filter(url => url.length > 0);
}

module.exports = {
  publishEvent,
  formatStatsMessage,
  formatWeeklyStatsMessage,
  parseRelays
};