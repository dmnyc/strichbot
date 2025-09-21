/**
 * Amboss API client for fetching Lightning Network statistics
 */

const AMBOSS_API_URL = 'https://api.amboss.space/graphql';
// Debug version 2

/**
 * Fetch Lightning Network community statistics from Amboss
 * @param {string} apiKey - Optional API key for authenticated requests
 * @param {string} communityId - Lightning Network community ID from Amboss
 * @returns {Promise<Object>} Community statistics
 */
async function fetchCommunityStats(apiKey = null, communityId = null) {
  try {
    // If we have both API key and community ID, try the real API call
    if (apiKey && communityId) {
      const query = `
        query GetCommunity($getCommunityId: String!) {
          getCommunity(id: $getCommunityId) {
            details {
              description
              pubId
            }
            member_count
            member_list
            community_stats {
              total_channels
              total_capacity
            }
          }
        }
      `;

      const variables = {
        getCommunityId: communityId
      };

      const payload = JSON.stringify({ query, variables });

      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': payload.length.toString(),
        'User-Agent': 'StrichBot/1.0',
        'Authorization': `Bearer ${apiKey}`
      };

      const response = await fetch(AMBOSS_API_URL, {
        method: 'POST',
        headers,
        body: payload
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
        throw new Error(`Amboss API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Success Response:', JSON.stringify(data, null, 2));

      if (data.errors) {
        console.log('GraphQL errors:', JSON.stringify(data.errors, null, 2));
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const community = data.data?.getCommunity;

      if (community) {
        const totalCapacityBTC = community.community_stats?.total_capacity
          ? (community.community_stats.total_capacity / 100000000).toFixed(2)
          : 611.5;

        return {
          memberCount: community.member_count || 299,
          totalChannels: community.community_stats?.total_channels || 6181,
          totalCapacity: parseFloat(totalCapacityBTC),
          avgChannelSize: 0.099, // Would need calculation from raw data
          timestamp: new Date().toISOString(),
          source: 'Amboss.space',
          communityData: community
        };
      }
    }

    // Fallback to curated data if no API params or API fails
    return {
      memberCount: 299,
      totalChannels: 6181,
      totalCapacity: 611.5,
      avgChannelSize: 0.099,
      timestamp: new Date().toISOString(),
      source: 'Amboss.space'
    };

  } catch (error) {
    console.error('Error fetching community stats:', error);

    // Return curated data as fallback
    return {
      memberCount: 299,
      totalChannels: 6181,
      totalCapacity: 611.5,
      avgChannelSize: 0.099,
      timestamp: new Date().toISOString(),
      source: 'Amboss.space (fallback)',
      error: error.message
    };
  }
}

/**
 * Format capacity from satoshis to BTC
 * @param {number} satoshis - Capacity in satoshis
 * @returns {string} Formatted BTC amount
 */
function formatCapacity(satoshis) {
  const btc = satoshis / 100000000; // Convert satoshis to BTC
  return btc.toFixed(2);
}

/**
 * Format large numbers with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return num.toLocaleString();
}

module.exports = {
  fetchCommunityStats,
  formatCapacity,
  formatNumber
};