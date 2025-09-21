/**
 * Test script for StrichBot functionality
 * Run with: node test/test-bot.js
 */

const { fetchNodestrichStats } = require('../lib/amboss');
const { formatStatsMessage, parseRelays } = require('../lib/nostr');

async function testBot() {
  console.log('🧪 Testing StrichBot functionality...\n');

  try {
    // Test 1: Fetch statistics from Amboss
    console.log('📊 Test 1: Fetching statistics from Amboss...');
    const stats = await fetchNodestrichStats();
    console.log('✅ Statistics fetched:', stats);
    console.log('');

    // Test 2: Format message
    console.log('📝 Test 2: Formatting Nostr message...');
    const message = formatStatsMessage(stats);
    console.log('✅ Message formatted:');
    console.log('---');
    console.log(message);
    console.log('---\n');

    // Test 3: Parse relays
    console.log('🔗 Test 3: Parsing relay URLs...');
    const relays = parseRelays(process.env.NOSTR_RELAYS);
    console.log('✅ Relays parsed:', relays);
    console.log('');

    // Test 4: Environment variables check
    console.log('🔧 Test 4: Checking environment variables...');
    const nsec = process.env.NOSTR_NSEC;

    if (!nsec) {
      console.log('⚠️  NOSTR_NSEC not set (this is expected for testing)');
    } else if (!nsec.startsWith('nsec1')) {
      console.log('❌ NOSTR_NSEC is not in correct format (should start with nsec1)');
    } else {
      console.log('✅ NOSTR_NSEC is properly formatted');
    }

    const apiKey = process.env.AMBOSS_API_KEY;
    if (apiKey) {
      console.log('✅ AMBOSS_API_KEY is set');
    } else {
      console.log('ℹ️  AMBOSS_API_KEY not set (optional)');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Set your NOSTR_NSEC environment variable');
    console.log('2. Deploy to Vercel');
    console.log('3. Configure environment variables in Vercel dashboard');
    console.log('4. Test the deployment by visiting /api/post-stats');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testBot();
}

module.exports = { testBot };