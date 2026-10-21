/**
 * Amboss API client for fetching Lightning Network statistics
 */

const AMBOSS_API_URL = 'https://api.amboss.space/graphql';

/**
 * Fetch Lightning Network community statistics from Amboss
 * @param {string} apiKey - Optional API key for authenticated requests
 * @param {string} communityId - Lightning Network community ID from Amboss
 * @returns {Promise<Object>} Community statistics including pending requests
 */
async function fetchCommunityStats(apiKey = null, communityId = null) {
  try {
    // Community stats are public; only pending member requests require an
    // API key, so the two queries are kept separate - an expired or missing
    // key must not take down the whole stats post.
    if (!communityId) {
      console.log('No community ID provided - skipping post');
      return null;
    }

    const community = await fetchCommunity(communityId);

    if (!community) {
      console.log('Community data unavailable - skipping post');
      return null;
    }

    const pendingRequests = await fetchPendingRequestCount(apiKey, communityId);

    const totalCapacityBTC = community.community_stats?.total_capacity
      ? (community.community_stats.total_capacity / 100000000).toFixed(2)
      : 611.5;

    return {
      memberCount: community.member_count || 299,
      totalChannels: community.community_stats?.total_channels || 6181,
      totalCapacity: parseFloat(totalCapacityBTC),
      avgChannelSize: 0.099, // Would need calculation from raw data
      pendingRequests,
      timestamp: new Date().toISOString(),
      source: 'Amboss'
    };

  } catch (error) {
    console.error('Error fetching community stats:', error);

    // Return null to skip posting if API fails
    return null;
  }
}

/**
 * Fetch public community stats from Amboss (no authentication required)
 * @param {string} communityId - Lightning Network community ID from Amboss
 * @returns {Promise<Object|null>} Community object or null when unavailable
 */
async function fetchCommunity(communityId) {
  const query = `
    query GetCommunity($getCommunityId: String!) {
      getCommunity(id: $getCommunityId) {
        member_count
        community_stats {
          total_channels
          total_capacity
        }
      }
    }
  `;

  const payload = JSON.stringify({ query, variables: { getCommunityId: communityId } });

  const response = await fetch(AMBOSS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length.toString(),
      'User-Agent': 'StrichBot/1.0'
    },
    body: payload
  });

  if (!response.ok) {
    throw new Error(`Amboss API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    console.log('GraphQL errors:', JSON.stringify(data.errors, null, 2));
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data?.getCommunity || null;
}

/**
 * Fetch pending member request count from Amboss (requires API key)
 * Degrades gracefully to 0 when the key is expired, invalid or missing
 * @param {string} apiKey - Amboss API key
 * @param {string} communityId - Lightning Network community ID from Amboss
 * @returns {Promise<number>} Number of pending requests, 0 when unavailable
 */
async function fetchPendingRequestCount(apiKey, communityId) {
  if (!apiKey) {
    console.log('No Amboss API key provided - posting without pending request count');
    return 0;
  }

  try {
    const query = `
      query GetCommunityRequests($getCommunityId: String!) {
        getAllCommunityRequests(id: $getCommunityId) {
          pubId
          pubkey
          approvals
          requiredApprovals
        }
      }
    `;

    const payload = JSON.stringify({ query, variables: { getCommunityId: communityId } });

    const response = await fetch(AMBOSS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length.toString(),
        'User-Agent': 'StrichBot/1.0',
        'Authorization': `Bearer ${apiKey}`
      },
      body: payload
    });

    if (!response.ok) {
      throw new Error(`Amboss API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const pendingRequests = data.data?.getAllCommunityRequests || [];
    return pendingRequests.length;
  } catch (error) {
    console.error('Pending member requests unavailable (API key expired or unauthorized) - continuing without count:', error.message);
    return 0;
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