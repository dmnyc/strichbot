/**
 * API endpoint to fetch latest community statistics for the landing page
 */

const { fetchCommunityStats } = require('../lib/amboss');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ambossApiKey = process.env.AMBOSS_API_KEY;
    const communityId = process.env.COMMUNITY_ID;

    // Fetch latest statistics
    const stats = await fetchCommunityStats(ambossApiKey, communityId);

    if (!stats) {
      // Return default stats if API unavailable
      return res.status(200).json({
        success: true,
        data: {
          memberCount: 299,
          totalChannels: 6180,
          totalCapacity: 611.43,
          timestamp: new Date().toISOString(),
          source: 'Default values (API unavailable)'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        memberCount: stats.memberCount,
        totalChannels: stats.totalChannels,
        totalCapacity: stats.totalCapacity,
        timestamp: stats.timestamp,
        source: stats.source
      }
    });

  } catch (error) {
    console.error('Error fetching stats for landing page:', error);

    // Return default stats on error
    return res.status(200).json({
      success: true,
      data: {
        memberCount: 299,
        totalChannels: 6180,
        totalCapacity: 611.43,
        timestamp: new Date().toISOString(),
        source: 'Default values (API error)'
      }
    });
  }
};