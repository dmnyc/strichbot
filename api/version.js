/**
 * Version API endpoint for StrichBot
 * Returns current version information including build details
 */

// Optional version info - fallback if file doesn't exist
let versionInfo;
try {
  versionInfo = require('../lib/version');
} catch (error) {
  versionInfo = {
    version: '1.0.0',
    fullVersion: '1.0.0',
    buildNumber: 'unknown',
    commitHash: 'unknown',
    buildTime: new Date().toISOString()
  };
}

export default function handler(req, res) {
  try {
    // Add some runtime information
    const runtimeInfo = {
      ...versionInfo,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: runtimeInfo
    });

  } catch (error) {
    console.error('Error in version endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve version information',
      timestamp: new Date().toISOString()
    });
  }
}