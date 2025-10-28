#!/usr/bin/env node

/**
 * Display what the regular messages will look like with pending requests
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
const { formatStatsMessage } = require('../lib/nostr');
const { formatStatsMessageForTelegram } = require('../lib/telegram');

async function showRegularMessages() {
  console.log('🔍 Fetching current stats to show regular message format...\n');

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
    console.log('📱 REGULAR NOSTR MESSAGE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const nostrMessage = formatStatsMessage(stats, blockData);
    console.log(nostrMessage);

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('💬 REGULAR TELEGRAM MESSAGE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const telegramMessage = formatStatsMessageForTelegram(stats, blockData);
    console.log(telegramMessage);

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('ℹ️  NOTE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('The "+ X pending" suffix will only appear when there are');
    console.log('pending requests (count > 0). Otherwise, the Members line');
    console.log('displays normally without the suffix.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

showRegularMessages();
