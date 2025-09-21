# StrichBot Version Management

## Version Numbering System

StrichBot follows semantic versioning with build numbers based on git commit hashes:

**Format**: `MAJOR.MINOR.PATCH+BUILD`

- **MAJOR**: Breaking changes or major feature releases
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, backwards compatible
- **BUILD**: Short git commit hash (7 characters)

**Examples**:
- `1.0.0+aad6ac3` - Version 1.0.0, build aad6ac3
- `1.1.0+b7e2f9a` - Version 1.1.0, build b7e2f9a
- `1.0.1+c3d8e5f` - Version 1.0.1, build c3d8e5f

## Version Generation

### Automatic Generation
```bash
npm run version
```

This generates `lib/version.js` with:
- Package version from `package.json`
- Git commit hash (full and short)
- Build timestamp
- Full version string with build number

### Manual Update
1. Update version in `package.json`
2. Run `npm run version` to regenerate version file
3. Commit changes

## Version Display

### API Endpoints
- **`/api/version`** - Returns complete version information
- **`/api/post-stats`** - Includes version in response
- **`/api/telegram-post`** - Includes version in response

### Landing Page
- Version displayed in footer as `v1.0.0+aad6ac3`
- Fetched dynamically from `/api/version`

### Logs
- All API functions log version on startup
- Format: `StrichBot v1.0.0+aad6ac3: Starting...`

## Version History

### v1.0.0 (September 2025)
- **Initial release** with Nostr posting functionality
- **Telegram integration** added in same release
- **Dual-platform posting** to Nostr and Telegram
- **Live Amboss API integration**
- **Vercel deployment** with cron scheduling
- **Landing page** with live statistics
- **Comprehensive documentation**

## Files

### Generated (Auto)
- `lib/version.js` - Version information module (gitignored)

### Scripts
- `scripts/version.js` - Version generation script

### Configuration
- `package.json` - Source of truth for version number
- `.gitignore` - Excludes auto-generated version file

### APIs
- `api/version.js` - Version information endpoint

## Best Practices

1. **Update package.json first** - Version number source of truth
2. **Run npm run version** - Regenerate version file after changes
3. **Commit version updates** - Include package.json changes
4. **Tag releases** - Use git tags for major releases
5. **Build numbers are automatic** - Based on current git commit

## Integration

The version system integrates with:
- **API responses** - All endpoints include version
- **Logging** - Version appears in all function logs
- **Landing page** - Dynamic version display
- **Error reporting** - Version included in error contexts
- **Monitoring** - Version tracking for deployments