#!/usr/bin/env node

/**
 * Display what the weekly messages will look like with pending requests
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
const { formatWeeklyStatsMessage } = require('../lib/nostr');
const { formatWeeklyStatsMessageForTelegram } = require('../lib/telegram');

async function showWeeklyMessages() {
  console.log('🔍 Fetching current stats to show weekly message format...\n');

  try {
    const apiKey = process.env.AMBOSS_API_KEY;
    const communityId = process.env.COMMUNITY_ID;

    const stats = await fetchCommunityStats(apiKey, communityId);
    const blockData = { height: 875432 }; // Example block height

    console.log('Current Stats:');
    console.log(`  Members: ${stats.memberCount}`);
    console.log(`  Channels: ${stats.totalChannels}`);
    console.log(`  Capacity: ${stats.totalCapacity} BTC`);
    console.log(`  Pending Requests: ${stats.pendingRequests || 0}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📱 WEEKLY NOSTR MESSAGE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const nostrMessage = await formatWeeklyStatsMessage(stats, blockData);
    console.log(nostrMessage);

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('💬 WEEKLY TELEGRAM MESSAGE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const telegramMessage = await formatWeeklyStatsMessageForTelegram(stats, blockData);
    console.log(telegramMessage);

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('ℹ️  NOTE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('If 7-day historical data is available, the messages will show');
    console.log('7-day trends with percentage changes. The "Pending Requests"');
    console.log('line will only appear when the count is greater than 0.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

showWeeklyMessages();
