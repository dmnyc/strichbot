/**
 * Test script for Telegram bot functionality
 * Run with: node test/test-telegram.js
 */

require('dotenv').config();
const { fetchCommunityStats } = require('../lib/amboss');
const { sendMessage, formatStatsMessageForTelegram, validateTelegramConfig } = require('../lib/telegram');

async function testTelegramBot() {
  try {
    console.log('🤖 Testing Telegram bot...\n');

    // Check environment variables
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    const ambossApiKey = process.env.AMBOSS_API_KEY;
    const communityId = process.env.COMMUNITY_ID;

    console.log('Environment variables:');
    console.log('✅ TELEGRAM_BOT_TOKEN:', telegramBotToken ? 'Set' : '❌ Missing');
    console.log('✅ TELEGRAM_CHAT_ID:', telegramChatId || '❌ Missing');
    console.log('✅ AMBOSS_API_KEY:', ambossApiKey ? 'Set' : '❌ Missing');
    console.log('✅ COMMUNITY_ID:', communityId || '❌ Missing');
    console.log('');

    // Validate Telegram config
    const validation = validateTelegramConfig(telegramBotToken, telegramChatId);
    if (!validation.valid) {
      console.error('❌ Telegram configuration invalid:', validation.errors);
      return;
    }
    console.log('✅ Telegram configuration valid\n');

    // Fetch stats
    console.log('📊 Fetching community stats...');
    const stats = await fetchCommunityStats(ambossApiKey, communityId);

    if (!stats) {
      console.log('❌ No stats available from Amboss API');
      return;
    }

    console.log('✅ Stats fetched:');
    console.log(`   Members: ${stats.memberCount}`);
    console.log(`   Channels: ${stats.totalChannels}`);
    console.log(`   Capacity: ${stats.totalCapacity} BTC\n`);

    // Format message
    const message = formatStatsMessageForTelegram(stats);
    console.log('📝 Formatted message:');
    console.log('---');
    console.log(message);
    console.log('---\n');

    // Send to Telegram
    console.log('📱 Sending to Telegram...');
    const result = await sendMessage(telegramBotToken, telegramChatId, message);

    console.log('✅ Successfully sent to Telegram!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Chat ID: ${result.chatId}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTelegramBot();