/**
 * Version information generator for StrichBot
 * Generates version info with commit hash and build metadata
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getVersionInfo() {
  try {
    // Get package.json version
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const version = packageJson.version;

    // Get git commit hash
    let commitHash = 'unknown';
    let commitShort = 'unknown';
    let buildNumber = 'unknown';

    try {
      commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      commitShort = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
      buildNumber = commitShort;
    } catch (error) {
      console.warn('Git not available, using fallback values');
    }

    // Get build timestamp
    const buildTime = new Date().toISOString();

    return {
      version,
      buildNumber,
      commitHash,
      commitShort,
      buildTime,
      fullVersion: `${version}+${buildNumber}`
    };
  } catch (error) {
    console.error('Error generating version info:', error);
    return {
      version: '1.0.0',
      buildNumber: 'unknown',
      commitHash: 'unknown',
      commitShort: 'unknown',
      buildTime: new Date().toISOString(),
      fullVersion: '1.0.0+unknown'
    };
  }
}

function generateVersionFile() {
  const versionInfo = getVersionInfo();

  const versionFile = `/**
 * StrichBot Version Information
 * Auto-generated - do not edit manually
 */

module.exports = ${JSON.stringify(versionInfo, null, 2)};
`;

  const outputPath = path.join(__dirname, '..', 'lib', 'version.js');
  fs.writeFileSync(outputPath, versionFile);

  console.log('Version file generated:');
  console.log(`  Version: ${versionInfo.version}`);
  console.log(`  Build: ${versionInfo.buildNumber}`);
  console.log(`  Full: ${versionInfo.fullVersion}`);
  console.log(`  Commit: ${versionInfo.commitShort}`);
  console.log(`  Build Time: ${versionInfo.buildTime}`);

  return versionInfo;
}

// Run if called directly
if (require.main === module) {
  generateVersionFile();
}

module.exports = {
  getVersionInfo,
  generateVersionFile
};