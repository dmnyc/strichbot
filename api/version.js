/**
 * Version API endpoint for StrichBot
 * Returns current version information including build details
 */

const versionInfo = require('../lib/version');

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