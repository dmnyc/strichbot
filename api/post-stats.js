/**
 * Vercel serverless function to post Nodestrich statistics to Nostr
 * This function is called by Vercel cron jobs every 6 hours
 */

const { fetchCommunityStats } = require('../lib/amboss');
const { publishEvent, formatStatsMessage, parseRelays } = require('../lib/nostr');

// Optional version info - fallback if file doesn't exist
let versionInfo;
try {
  versionInfo = require('../lib/version');
} catch (error) {
  versionInfo = { fullVersion: '1.0.0' };
}

/**
 * Main handler for the Vercel serverless function
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
module.exports = async function handler(req, res) {
  // Set CORS headers for development/testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`StrichBot v${versionInfo.fullVersion}: Starting statistics posting job`);

  try {
    // Get environment variables
    const nsec = process.env.NOSTR_NSEC;
    const ambossApiKey = process.env.AMBOSS_API_KEY;
    const communityId = process.env.COMMUNITY_ID;
    const relayString = process.env.NOSTR_RELAYS;

    // Validate required environment variables
    if (!nsec) {
      throw new Error('NOSTR_NSEC environment variable is required');
    }

    if (!nsec.startsWith('nsec1')) {
      throw new Error('NOSTR_NSEC must be in nsec1 format');
    }

    console.log('StrichBot: Environment variables validated');

    // Fetch statistics from Amboss
    console.log('StrichBot: Fetching statistics from Amboss...');
    const stats = await fetchCommunityStats(ambossApiKey, communityId);

    // If no stats returned (API failed or no credentials), skip posting
    if (!stats) {
      console.log('StrichBot: No statistics available - skipping post');
      return res.status(200).json({
        success: true,
        message: 'No statistics available - post skipped',
        reason: 'API unavailable or no credentials provided',
        timestamp: new Date().toISOString()
      });
    }

    console.log('StrichBot: Statistics fetched:', stats);

    // Format the message
    const message = formatStatsMessage(stats);
    console.log('StrichBot: Message formatted:', message.substring(0, 100) + '...');

    // Parse relay URLs
    const relays = parseRelays(relayString);
    console.log('StrichBot: Using relays:', relays);

    // Publish to Nostr
    console.log('StrichBot: Publishing to Nostr...');
    const result = await publishEvent(nsec, message, relays);

    console.log('StrichBot: Published successfully:', {
      eventId: result.eventId,
      publishedTo: result.publishedTo,
      totalRelays: result.totalRelays
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Statistics posted successfully',
      eventId: result.eventId,
      publishedTo: result.publishedTo,
      totalRelays: result.totalRelays,
      timestamp: new Date().toISOString(),
      version: versionInfo.fullVersion,
      stats: stats,
      relays: result.results.map(r => ({
        relay: r.relay,
        success: r.success
      }))
    });

  } catch (error) {
    console.error('StrichBot: Error in posting job:', error);

    // Return error response
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Export for testing
module.exports.handler = module.exports;