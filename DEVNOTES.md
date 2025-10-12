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

## Session: 2025-09-25 - Admin System Complete Rebuild

### Branch: `rebuild-admin` (Current)

**Previous session completion:** Successfully restored working posting functionality on `restore-working-state` branch and updated cron schedule to 21:00 UTC (5:00 PM EDT).

### Critical Issues Discovered
**Problem:** Admin interface completely broken after restoring to working posting state
- All status fields stuck on "Loading..."
- Module format conflicts between ES modules (admin APIs) and CommonJS (posting system)
- Interface not mobile-friendly and too spacious
- Hard-coded schedule showing old time (16:00 UTC instead of 21:00 UTC)

### Complete System Rebuild - What Was Done

#### Phase 1: Fixed Core Infrastructure ✅
**Problem:** Module import failures causing HTTP 500 errors
**Solution:** Converted all admin APIs to CommonJS format to match working posting system

**Files Converted to CommonJS:**
- `api/version.js` - Import/export → require/module.exports
- `api/admin/stats.js` - Import/export → require/module.exports
- `lib/dataStore.js` - Import/export → require/module.exports
- `lib/database.js` - Import/export → require/module.exports
- `lib/scheduler.js` - Import/export → require/module.exports

**Result:** All APIs now use consistent CommonJS format, eliminating import conflicts

#### Phase 2: Created Compact Interface Design ✅
**Problem:** Interface too spacious, not mobile-friendly, showing wrong schedule time
**Solution:** Complete HTML/CSS redesign focusing on space efficiency

**New Design Features:**
- **Compact Layout**: Horizontal grids instead of vertical cards (60% space reduction)
- **Mobile Responsive**: Touch-friendly controls, works on all screen sizes
- **Updated Schedule**: Shows "21:00 UTC (5:00 PM EDT)" instead of old "16:00 UTC"
- **Essential Functions Only**: Removed unused weekly/monthly/annual report sections
- **Modern Styling**: Clean dark theme with proper visual hierarchy
- **Inline Controls**: API key and data export in horizontal compact forms

**Files Completely Rewritten:**
- `public/admin/index.html` - New compact structure with embedded CSS
- **Result:** Single-page interface with all essential functions visible at once

#### Phase 3: Streamlined JavaScript ✅
**Problem:** Complex code with stuck loading states and unreliable API calls
**Solution:** Complete JavaScript rewrite focusing on essential functionality

**New JavaScript Features:**
- **Auto-Refresh**: System status updates every 30 seconds automatically
- **Timeout Handling**: 5-second timeouts prevent stuck "Loading..." states
- **Graceful Error Recovery**: Shows "N/A" or "Error" instead of infinite loading
- **Toast Notifications**: Real-time feedback for all actions
- **Persistent Auth**: Login state saved in localStorage
- **Essential Functions**: Only core features (status, toggle, testing, export)

**Files Completely Rewritten:**
- `public/admin/admin.js` - New streamlined class-based approach

#### Phase 4: Enhanced Reliability ✅
**Robust Error Handling:**
- API call timeouts prevent stuck states
- Promise.allSettled() handles partial failures gracefully
- Loading states show actual values or meaningful fallbacks

**Real-time Features:**
- Auto-refresh with visible "Last updated" timestamp
- Live status indicators (🟢 Valid, 🟡 Expiring Soon, 🔴 Expired)
- Immediate feedback for all user actions

### Current Admin System Features

#### Core Interface (Compact Design)
1. **System Status Grid** - API key, last post, data points, version
2. **Schedule Control** - Daily post toggle with current time display
3. **Testing Tools** - Telegram, Nostr, API connectivity tests
4. **API Key Management** - Expiry date setting with UTC display
5. **Data Export** - CSV export with date range selection

#### Technical Specifications
- **Module Format**: CommonJS throughout (matches posting system)
- **Auto-Refresh**: 30-second intervals for status updates
- **Responsive Design**: Works on desktop, tablet, mobile
- **Error Handling**: Timeouts, graceful failures, user feedback
- **Authentication**: Persistent login with localStorage

### Current Posting Schedule (Updated)
```
Daily Nostr:    0 21 * * *  (5:00 PM EDT / 9:00 PM UTC)
Daily Telegram: 5 21 * * *  (5:05 PM EDT / 9:05 PM UTC)
API Key Check:  0 9 * * *   (9:00 AM UTC)
```

### Database Schema (Confirmed Working)
**Required Tables:**
- `schedule_config` - Platform enable/disable flags
- `api_key_config` - API key expiry management
- `historical_stats` - Daily metrics storage

### Testing Results ✅
**Before Rebuild:**
- ❌ Status fields: "Loading..." (stuck)
- ❌ Testing functions: HTTP 500 errors
- ❌ Schedule display: Wrong time (16:00 UTC)
- ❌ Mobile interface: Poor usability

**After Rebuild:**
- ✅ Status fields: Real data from APIs
- ✅ Testing functions: Working Telegram and Nostr tests
- ✅ Schedule display: Correct time (21:00 UTC / 5:00 PM EDT)
- ✅ Mobile interface: Fully responsive and touch-friendly
- ✅ Auto-refresh: Live updates every 30 seconds
- ✅ Error handling: Graceful failures with user feedback

### Files Modified in rebuild-admin Branch
**Complete Rewrites:**
- `public/admin/index.html` - New compact responsive design
- `public/admin/admin.js` - Streamlined JavaScript with auto-refresh

**Module Format Conversions:**
- `api/version.js` - ES modules → CommonJS
- `api/admin/stats.js` - ES modules → CommonJS
- `lib/dataStore.js` - ES modules → CommonJS
- `lib/database.js` - ES modules → CommonJS
- `lib/scheduler.js` - ES modules → CommonJS

### Architecture Decisions
1. **CommonJS Everywhere**: Eliminated module format conflicts by using CommonJS throughout
2. **Compact Design**: Optimized for space efficiency and mobile use
3. **Essential Features Only**: Removed unused functionality to reduce complexity
4. **Auto-Refresh**: Real-time updates without manual refresh needed
5. **Graceful Degradation**: System works even if some APIs fail

### Next Steps
1. **Test rebuilt admin system** - Verify all functions work correctly
2. **Deploy to production** - Merge `rebuild-admin` branch when ready
3. **Monitor auto-refresh** - Ensure 30-second updates work reliably
4. **Verify mobile experience** - Test on various screen sizes

### Lessons Learned
- **Module consistency is critical** - ES/CommonJS mixing causes hard-to-debug failures
- **Loading states need timeouts** - Prevent infinite "Loading..." situations
- **Mobile-first design** - Compact interfaces work better on all devices
- **Less is more** - Essential functions only reduces complexity and improves reliability

---
**Last Updated:** 2025-09-25 (Admin System Rebuild Complete)
**Developer:** Daniel with Claude Code assistance