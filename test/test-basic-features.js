/**
 * Basic test script for new cron job features
 * Tests core functionality without external dependencies
 */

const { checkKeyExpiration, formatExpirationWarning } = require('../lib/keyMonitor');
const { storeStats, getLatestStats } = require('../lib/dataStore');
const { generateWeeklyReport } = require('../lib/trendAnalysis');
const { generateCronSchedules, loadScheduleConfig } = require('../lib/scheduler');

async function testKeyMonitoring() {
  console.log('\n🔑 Testing API Key Monitoring...');

  // Test with different expiration scenarios
  const testCases = [
    {
      name: 'Key expires in 7 days',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      warningDays: [7, 3, 1]
    },
    {
      name: 'Key expires in 1 day',
      expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      warningDays: [7, 3, 1]
    },
    {
      name: 'Key already expired',
      expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      warningDays: [7, 3, 1]
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n  Testing: ${testCase.name}`);
    const result = checkKeyExpiration(testCase.expiryDate, testCase.warningDays);

    console.log(`    Should warn: ${result.shouldWarn}`);
    console.log(`    Days until expiry: ${result.daysUntilExpiry}`);
    console.log(`    Urgency: ${result.urgency || 'none'}`);

    if (result.shouldWarn) {
      const warning = formatExpirationWarning(result);
      console.log(`    Warning message preview: ${warning.substring(0, 100)}...`);
    }
  }

  console.log('✅ API key monitoring tests completed');
}

async function testDataStorage() {
  console.log('\n💾 Testing Data Storage...');

  // Create mock statistics data
  const mockStats = {
    timestamp: new Date().toISOString(),
    memberCount: 299,
    totalChannels: 6187,
    totalCapacity: 616.94,
    blockHeight: 915789,
    source: 'Amboss.space'
  };

  try {
    // Test storing data
    console.log('  Storing mock statistics...');
    await storeStats(mockStats);
    console.log('  ✅ Statistics stored successfully');

    // Test retrieving latest data
    console.log('  Retrieving latest statistics...');
    const latest = await getLatestStats();

    if (latest) {
      console.log(`  ✅ Latest stats retrieved: ${latest.memberCount} members, ${latest.totalChannels} channels`);
    } else {
      console.log('  ⚠️ No latest stats found');
    }

  } catch (error) {
    console.log(`  ❌ Data storage test failed: ${error.message}`);
  }
}

async function testScheduler() {
  console.log('\n⏰ Testing Schedule Management...');

  try {
    // Load schedule configuration
    console.log('  Loading schedule configuration...');
    const config = await loadScheduleConfig();
    console.log(`  ✅ Configuration loaded`);

    // Generate cron schedules
    console.log('  Generating cron schedules...');
    const cronSchedules = generateCronSchedules(config);

    console.log('  Generated schedules:');
    Object.entries(cronSchedules).forEach(([type, schedule]) => {
      console.log(`    ${type}:`);
      Object.entries(schedule).forEach(([platform, cron]) => {
        if (cron) {
          console.log(`      ${platform}: ${cron}`);
        }
      });
    });

    console.log('  ✅ Schedule generation completed');

  } catch (error) {
    console.log(`  ❌ Schedule management test failed: ${error.message}`);
  }
}

async function runBasicTests() {
  console.log('🧪 StrichBot Basic Feature Tests');
  console.log('=================================');

  try {
    await testKeyMonitoring();
    await testDataStorage();
    await testScheduler();

    console.log('\n🎉 Basic feature tests completed!');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests if called directly
if (require.main === module) {
  runBasicTests();
}

module.exports = {
  testKeyMonitoring,
  testDataStorage,
  testScheduler,
  runBasicTests
};