# StrichBot Development Notes

## Session: 2025-09-24 - Scheduler Simplification

### Current State
**Branch:** `simplify-scheduler` (ready to merge)

**Previous branches completed:**
- `admin-updates` - Simplified scheduler UI, migrated API key config to MySQL
- `admin-debug` - Dynamic scheduler attempt (abandoned due to Vercel Hobby tier limits)

### What Was Completed

#### 1. API Key Configuration (admin-updates branch - MERGED)
- **Migrated to MySQL database**: API key expiry date and warning days now stored in `api_key_config` table
- **Admin UI functional**: Can view/edit API key expiration from admin panel
- **Fixed timezone bug**: Datetime conversion now properly handles UTC <-> local time
- **Database helper**: Created `lib/apiKeyConfig.js` for get/save operations
- **Removed env vars**: `AMBOSS_API_KEY_EXPIRY_DATE` and `API_KEY_WARNING_DAYS` no longer needed

#### 2. Scheduler Simplification (current branch - NEEDS MERGE)
**Problem:** Vercel Hobby tier only allows daily cron jobs (no hourly scheduling)

**Solution:** Simplified to static schedule with platform toggles only
- Admin panel now **read-only for times** - shows: "16:00 UTC (4:00 PM) Daily"
- Platform enable/disable toggles **still functional** (stored in MySQL)
- Removed complex time/day/date pickers from UI
- Simplified database config structure to just platform flags:
  ```json
  {
    "platforms": {
      "daily": { "nostr": true, "telegram": true },
      "weekly": { "nostr": false, "telegram": false },
      "monthly": { "nostr": false, "telegram": false },
      "annual": { "nostr": false, "telegram": false }
    }
  }
  ```

#### 3. Files Modified (simplify-scheduler branch)
- `public/admin/index.html` - Made schedule times read-only, added notes
- `public/admin/admin.js` - Simplified config get/save, removed preview functions
- `lib/scheduler.js` - Updated default config to simplified structure
- `vercel.json` - Already correct with static cron (no changes needed)

### Current Posting Schedule (vercel.json)
```
Daily Nostr:    0 16 * * *  (4:00 PM UTC)
Daily Telegram: 5 16 * * *  (4:05 PM UTC)
API Key Check:  0 9 * * *   (9:00 AM UTC)
```

### How to Change Posting Times
1. Edit `vercel.json` cron schedules
2. Commit and push changes
3. Vercel will auto-deploy

### Database Schema
**Tables in use:**
- `api_key_config` - API key expiry and warning days
- `schedule_config` - Platform enable/disable flags (simplified JSON)
- `data_points` - Historical metrics data
- `community_stats` - Stats history

### Next Steps
1. Merge `simplify-scheduler` to `main`
2. Deploy to production
3. Test admin panel platform toggles work correctly
4. Verify posts go out at 4 PM UTC daily

### Known Issues/Limitations
- **Schedule times are static** in vercel.json (requires redeploy to change)
- **Admin panel is read-only for times** (by design - shows current static schedule)
- **Platform toggles work** but require enabled cron in vercel.json to actually post
- **Weekly/Monthly/Annual reports**: Not configured in vercel.json yet (platform toggles ready when needed)

### Environment Variables Still Needed
- `ADMIN_TOKEN` - Admin panel authentication
- `AMBOSS_API_KEY` - Amboss API access
- `COMMUNITY_ID` - Amboss community ID
- `NOSTR_NSEC` - Nostr private key
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Telegram chat ID
- `CRON_SECRET` - Vercel cron authentication
- `MYSQL_*` - Database connection (host, user, password, database)
- `DATA_RETENTION_DAYS` - Data cleanup threshold (default: 400)

### Removed Environment Variables
- `AMBOSS_API_KEY_EXPIRY_DATE` - Now in MySQL
- `API_KEY_WARNING_DAYS` - Now in MySQL

### Git Branches Status
```
main - Stable, has admin-updates merged
admin-updates - MERGED to main
admin-debug - Abandoned (hourly cron not supported on Hobby tier)
simplify-scheduler - CURRENT, ready to merge
```

### Commit Messages Used
```bash
# admin-updates merge commit:
Simplify admin scheduler UI and migrate API key config to database

- Remove confusing platform-specific time fields from scheduler interface
- Migrate API key expiry date and warning days from env vars to MySQL database
- Add lib/apiKeyConfig.js for database-backed configuration management
- Fix ES module imports in check-api-key.js and version.js endpoints
- Update admin UI to display and edit API key configuration from database

# simplify-scheduler (when ready to commit):
Simplify scheduler to static times with platform toggles

- Make schedule times read-only in admin panel (requires vercel.json edit to change)
- Simplify database config to just platform enable/disable flags
- Remove complex time/day/date pickers from UI
- Update button text to "Save Platform Settings"
- Keep static cron jobs in vercel.json for Vercel Hobby tier compatibility
```

### Testing Checklist (Before Merge)
- [ ] Admin panel loads correctly
- [ ] Platform toggles save to database
- [ ] Platform toggles load from database
- [ ] API key expiry date displays and saves correctly
- [ ] Read-only schedule info displays: "16:00 UTC (4:00 PM) Daily"
- [ ] No console errors in browser
- [ ] vercel.json has correct cron schedules
- [ ] Deployment succeeds on Vercel

### Architecture Decisions Made
1. **Static vs Dynamic Scheduling**: Chose static due to Vercel Hobby tier limitation (daily cron only)
2. **MySQL for Config**: Moved API key config and platform toggles to database for editability
3. **Read-Only Times**: Admin UI shows current schedule but can't change it (requires file edit)
4. **Platform Toggles**: Keep functional admin control over which platforms post to

### Files That Were Attempted But Removed
- `api/scheduler.js` - Unified dynamic scheduler (removed, not compatible with Hobby tier)

### Latest Updates (Post-Simplification)

#### 4. Admin Interface Improvements (September 24, 2025 - Session 2)
**Problem:** Admin interface had confusing platform-specific toggles and non-functional category controls

**Solution:** Simplified to single category toggles with working backend integration
- **Single Category Toggles**: Replaced platform-specific toggles (Nostr ✓, Telegram ✓) with single on/off per category ("Enable Daily Posts", etc.)
- **Fixed API Key Date Handling**: Removed problematic timezone conversion, now displays dates like "9/16/2026 at 00:00" accurately with UTC label
- **Removed Warning Days Input**: Made warning days non-editable (hardcoded to "7,3,1") since API key management is now calendar-based
- **Working Category Controls**: Updated posting endpoints (`/api/post-stats`, `/api/telegram-post`) to check database category settings
- **Database Column Case Fix**: Fixed "Last Daily Post: Never" issue by handling uppercase database column names (`TIMESTAMP`, `SOURCE`)

**Files Modified:**
- `public/admin/index.html` - Single category toggles, UTC label, removed warning days
- `public/admin/admin.js` - Category config structure, fixed date handling, hardcoded warning days
- `lib/scheduler.js` - Simplified default config to `categories: {daily: true, weekly: false, ...}`
- `lib/dataStore.js` - Fixed column name case sensitivity (`row.TIMESTAMP || row.timestamp`)
- `api/post-stats.js` - Added category check before posting
- `api/telegram-post.js` - Added category check before posting

**Database Schema (Updated):**
```json
{
  "categories": {
    "daily": true,
    "weekly": false,
    "monthly": false,
    "annual": false
  }
}
```

**Admin Panel Now Shows:**
- ✅ "Enable Daily Posts" (single toggle instead of separate Nostr/Telegram)
- ✅ "Expiration Date (UTC)" with accurate date handling
- ✅ "Last Daily Post: 2025-09-24T16:56:38.000Z" (instead of "Never")
- ✅ Functional category toggles that actually control posting

---
**Last Updated:** 2025-09-24
**Developer:** Daniel with Claude Code assistance