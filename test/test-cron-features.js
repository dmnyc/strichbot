/**
 * Test script for new cron job features
 * Tests API key monitoring, trend analysis, and data storage
 */

const { checkKeyExpiration, formatExpirationWarning } = require('../lib/keyMonitor');
const { storeStats, getLatestStats, cleanupOldData } = require('../lib/dataStore');
const { generateWeeklyReport, formatTrendReportForNostr } = require('../lib/trendAnalysis');
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

async function testTrendAnalysis() {
  console.log('\n📈 Testing Trend Analysis...');

  try {
    // Generate a weekly report
    console.log('  Generating weekly trend report...');
    const weeklyReport = await generateWeeklyReport();

    if (weeklyReport.success) {
      console.log(`  ✅ Weekly report generated successfully`);
      console.log(`  Data available: ${weeklyReport.analysis.available}`);

      if (weeklyReport.analysis.available) {
        // Format for Nostr
        const nostrMessage = formatTrendReportForNostr(weeklyReport);
        console.log(`  Sample Nostr message: ${nostrMessage.substring(0, 200)}...`);
      } else {
        console.log(`  ⚠️ Insufficient data for trend analysis: ${weeklyReport.analysis.reason}`);
      }
    } else {
      console.log(`  ❌ Weekly report generation failed: ${weeklyReport.error}`);
    }

  } catch (error) {
    console.log(`  ❌ Trend analysis test failed: ${error.message}`);
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

async function runAllTests() {
  console.log('🧪 StrichBot Cron Features Test Suite');
  console.log('=====================================');

  try {
    await testKeyMonitoring();
    await testDataStorage();
    await testTrendAnalysis();
    await testScheduler();

    console.log('\n🎉 All cron feature tests completed!');
    console.log('\nNext steps:');
    console.log('1. Configure environment variables for API key expiration');
    console.log('2. Set up admin token for dashboard access');
    console.log('3. Access admin dashboard at /admin/');
    console.log('4. Test the system in production');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testKeyMonitoring,
  testDataStorage,
  testTrendAnalysis,
  testScheduler,
  runAllTests
};