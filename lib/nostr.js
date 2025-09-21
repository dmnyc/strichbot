/**
 * Nostr client for posting events to relays
 */

const { finalizeEvent, verifyEvent, getPublicKey, nip19 } = require('nostr-tools');
const { Relay } = require('nostr-tools/relay');

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
 * @returns {string} Formatted message for Nostr
 */
function formatStatsMessage(stats) {
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

📈 Data from ${source.replace('Amboss.space', 'Amboss')}

${new Date(timestamp).toLocaleString('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})} ET
Updated powered by StrichBot ♾️🤖⚡

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
  parseRelays
};