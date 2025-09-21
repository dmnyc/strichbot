/**
 * Version API endpoint for StrichBot
 * Returns current version information including build details
 */

const { securityMiddleware, setSecurityHeaders } = require('../lib/security');

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
    // Apply security headers
    setSecurityHeaders(res);

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', 'https://strichbot.vercel.app');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }

    // Apply lighter security for read-only endpoint
    const securityCheck = securityMiddleware(req, res, {
      maxRequests: 60,          // 60 requests per hour (more lenient for read-only)
      windowMs: 60 * 60 * 1000, // 1 hour window
      allowedMethods: ['GET'],
      requireAuth: false        // No auth required for version info
    });

    if (!securityCheck.allowed) {
      // Add any additional headers from security check
      if (securityCheck.headers) {
        Object.entries(securityCheck.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      return res.status(securityCheck.status).json({
        success: false,
        error: securityCheck.error,
        timestamp: new Date().toISOString()
      });
    }

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