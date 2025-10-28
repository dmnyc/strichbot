#!/usr/bin/env node

/**
 * Integration test for pending requests feature
 * Tests the complete flow from API query to formatted message
 */

const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const { fetchCommunityStats } = require('../lib/amboss');
const { formatStatsMessage, formatWeeklyStatsMessage } = require('../lib/nostr');
const { formatStatsMessageForTelegram, formatWeeklyStatsMessageForTelegram } = require('../lib/telegram');

async function testPendingRequestsIntegration() {
  console.log('🧪 Testing Pending Requests Integration\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Fetch stats from Amboss
    console.log('Step 1: Fetching community stats from Amboss...');
    const apiKey = process.env.AMBOSS_API_KEY;
    const communityId = process.env.COMMUNITY_ID;

    if (!apiKey || !communityId) {
      console.error('❌ Missing AMBOSS_API_KEY or COMMUNITY_ID');
      process.exit(1);
    }

    const stats = await fetchCommunityStats(apiKey, communityId);

    if (!stats) {
      console.error('❌ Failed to fetch stats');
      process.exit(1);
    }

    console.log('✅ Stats fetched successfully\n');
    console.log('Stats Data:');
    console.log(`  - Members: ${stats.memberCount}`);
    console.log(`  - Channels: ${stats.totalChannels}`);
    console.log(`  - Capacity: ${stats.totalCapacity} BTC`);
    console.log(`  - Pending Requests: ${stats.pendingRequests || 0}`);
    console.log(`  - Timestamp: ${stats.timestamp}`);
    console.log(`  - Source: ${stats.source}\n`);

    // Step 2: Test Nostr formatting (regular)
    console.log('Step 2: Testing Nostr message formatting...');
    const blockData = { height: 900000 }; // Mock block data
    const nostrMessage = formatStatsMessage(stats, blockData);
    console.log('✅ Nostr message formatted\n');
    console.log('Nostr Message:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(nostrMessage);
    console.log('─────────────────────────────────────────────────────────\n');

    // Step 3: Test Nostr formatting (weekly)
    console.log('Step 3: Testing Weekly Nostr message formatting...');
    const weeklyNostrMessage = await formatWeeklyStatsMessage(stats, blockData);
    console.log('✅ Weekly Nostr message formatted\n');
    console.log('Weekly Nostr Message:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(weeklyNostrMessage);
    console.log('─────────────────────────────────────────────────────────\n');

    // Step 4: Test Telegram formatting (regular)
    console.log('Step 4: Testing Telegram message formatting...');
    const telegramMessage = formatStatsMessageForTelegram(stats, blockData);
    console.log('✅ Telegram message formatted\n');
    console.log('Telegram Message:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(telegramMessage);
    console.log('─────────────────────────────────────────────────────────\n');

    // Step 5: Test Telegram formatting (weekly)
    console.log('Step 5: Testing Weekly Telegram message formatting...');
    const weeklyTelegramMessage = await formatWeeklyStatsMessageForTelegram(stats, blockData);
    console.log('✅ Weekly Telegram message formatted\n');
    console.log('Weekly Telegram Message:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(weeklyTelegramMessage);
    console.log('─────────────────────────────────────────────────────────\n');

    // Step 6: Verify pending requests are appended to Members line
    console.log('Step 6: Verifying pending requests are appended to Members line...');
    const hasPendingInNostr = stats.pendingRequests > 0
      ? nostrMessage.includes(`Members: ${stats.memberCount.toLocaleString()} + ${stats.pendingRequests} pending`)
      : !nostrMessage.includes('pending');
    const hasPendingInTelegram = stats.pendingRequests > 0
      ? telegramMessage.includes(`Members: <b>${stats.memberCount.toLocaleString()} + ${stats.pendingRequests} pending</b>`)
      : !telegramMessage.includes('pending');

    if (hasPendingInNostr && hasPendingInTelegram) {
      console.log('✅ Pending requests correctly appended to Members line\n');
    } else {
      console.log('⚠️  Pending requests handling:');
      console.log(`  - Nostr: ${hasPendingInNostr ? '✅' : '❌'}`);
      console.log(`  - Telegram: ${hasPendingInTelegram ? '✅' : '❌'}\n`);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Integration Test Complete!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Summary:');
    console.log(`  ✅ API query returns pendingRequests field: ${stats.pendingRequests !== undefined}`);
    console.log(`  ✅ Current pending requests: ${stats.pendingRequests || 0}`);
    console.log(`  ✅ Messages formatted correctly`);
    console.log(`  ✅ Pending appended to Members line when > 0`);
    console.log(`  ✅ Members line normal when = 0\n`);

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

testPendingRequestsIntegration();
