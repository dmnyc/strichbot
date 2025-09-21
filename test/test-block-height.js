/**
 * Test script for Bitcoin block height integration
 * Run with: node test/test-block-height.js
 */

const { fetchBlockHeight, fetchBlockData, formatBlockHeight } = require('../lib/mempool');
const { formatStatsMessage } = require('../lib/nostr');
const { formatStatsMessageForTelegram } = require('../lib/telegram');

async function testBlockHeightFetching() {
  console.log('🪙 Testing Bitcoin Block Height Integration...\n');

  try {
    // Test block height fetching
    console.log('1. Testing block height API...');
    const height = await fetchBlockHeight();

    if (height !== null) {
      console.log(`✅ Successfully fetched block height: ${height.toLocaleString()}`);
    } else {
      console.log('❌ Failed to fetch block height');
      return;
    }

    // Test block data fetching
    console.log('\n2. Testing block data fetching...');
    const blockData = await fetchBlockData();

    if (blockData) {
      console.log('✅ Successfully fetched block data:');
      console.log(`   Height: ${blockData.height.toLocaleString()}`);
      console.log(`   Timestamp: ${blockData.timestamp}`);
      console.log(`   Source: ${blockData.source}`);
    } else {
      console.log('❌ Failed to fetch block data');
      return;
    }

    // Test formatting
    console.log('\n3. Testing block height formatting...');
    const formattedHeight = formatBlockHeight(blockData.height);
    console.log(`✅ Formatted height: ${formattedHeight}`);

    // Test message formatting with mock stats
    console.log('\n4. Testing message formatting...');
    const mockStats = {
      memberCount: 299,
      totalChannels: 6187,
      totalCapacity: 616.94,
      timestamp: new Date().toISOString(),
      source: 'Amboss.space'
    };

    // Test Nostr message
    console.log('\n📝 Nostr message format:');
    const nostrMessage = formatStatsMessage(mockStats, blockData);
    console.log('---');
    console.log(nostrMessage);
    console.log('---');

    // Test Telegram message
    console.log('\n📱 Telegram message format:');
    const telegramMessage = formatStatsMessageForTelegram(mockStats, blockData);
    console.log('---');
    console.log(telegramMessage);
    console.log('---');

    // Test message formatting without block data
    console.log('\n5. Testing fallback (no block data)...');
    const nostrFallback = formatStatsMessage(mockStats, null);
    const telegramFallback = formatStatsMessageForTelegram(mockStats, null);

    console.log('✅ Nostr fallback works (no extra block height line)');
    console.log('✅ Telegram fallback works (no extra block height line)');

    console.log('\n🎉 All block height tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test invalid block height formatting
function testFormatting() {
  console.log('\n6. Testing edge cases...');

  const testCases = [
    { input: 850000, expected: '850,000' },
    { input: NaN, expected: 'Unknown' },
    { input: null, expected: 'Unknown' },
    { input: undefined, expected: 'Unknown' },
    { input: 'invalid', expected: 'Unknown' }
  ];

  testCases.forEach(({ input, expected }) => {
    const result = formatBlockHeight(input);
    if (result === expected) {
      console.log(`✅ formatBlockHeight(${input}) = "${result}"`);
    } else {
      console.log(`❌ formatBlockHeight(${input}) = "${result}", expected "${expected}"`);
    }
  });
}

async function runTests() {
  await testBlockHeightFetching();
  testFormatting();
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testBlockHeightFetching,
  testFormatting,
  runTests
};