# Add Telegram Bot Functionality for Dual-Platform Posting

## Overview
This PR adds comprehensive Telegram bot functionality to StrichBot, enabling dual-platform posting to both Nostr and Telegram. The bot now posts Lightning Network statistics for the Nodestrich community to both platforms simultaneously, maintaining the same scheduling and data source.

## 🚀 New Features

### Telegram Integration
- **Dual-platform posting**: Posts to both Nostr and Telegram daily at 12pm Eastern
- **HTML-formatted messages**: Telegram posts use HTML formatting for better readability
- **Same data source**: Uses identical Amboss API data as Nostr posts
- **Independent operation**: Telegram posting works independently of Nostr (one can fail without affecting the other)

### API Endpoints
- **New endpoint**: `/api/telegram-post` for Telegram-specific posting
- **Existing endpoint**: `/api/post-stats` continues to handle Nostr posting
- **Both scheduled**: Same cron schedule (0 17 * * *) for synchronized posting

### Configuration
- **Environment variables**: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- **Documentation**: Complete setup guide for creating Telegram bots via BotFather
- **Chat ID discovery**: Multiple methods documented for finding Telegram group IDs

## 📁 Files Added
- `lib/telegram.js` - Telegram API client and message formatting
- `api/telegram-post.js` - Serverless function for Telegram posting
- `test/test-telegram.js` - Independent test script for Telegram functionality

## 📝 Files Modified
- `package.json` - Added `node-telegram-bot-api` dependency
- `vercel.json` - Added Telegram cron job and function configuration
- `public/index.html` - Updated to describe dual-platform functionality and added Telegram group link
- `DEPLOYMENT.md` - Comprehensive Telegram setup instructions with multiple chat ID discovery methods

## 🔧 Technical Details

### Message Format
Telegram messages use HTML formatting with bold text for statistics:
```
⚡ Nodestrich ♾️ Community Update ⚡

📊 Group Stats:

👥 Members: 299
🔗 Channels: 6,187
🪙 Capacity: 616.94 BTC

📈 Data from Amboss
Sep 21, 2025, 09:55 AM ET
Updated powered by StrichBot ♾️🤖⚡
```

### Error Handling
- Validates Telegram configuration before attempting to post
- Graceful failure: Telegram errors don't affect Nostr posting
- Comprehensive logging for debugging
- Returns detailed JSON responses for monitoring

### Dependencies
- `node-telegram-bot-api: ^0.66.0` - Official Telegram Bot API library
- Existing dependencies unchanged

## 🧪 Testing

### Manual Testing
1. **Browser test**: Visit `https://your-project.vercel.app/api/telegram-post`
2. **curl test**: `curl -X GET https://your-project.vercel.app/api/telegram-post`
3. **Local test**: `node test/test-telegram.js`

### Test Results
✅ Successfully tested with Nodestrich Telegram group (ID: -1001777675762)
✅ Message formatting displays correctly with HTML styling
✅ Live data integration working (members: 299, channels: 6,187, capacity: 616.94 BTC)
✅ Error handling and validation working as expected

## 📋 Environment Variables

### Required for Telegram
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Group/channel ID (negative number for groups)

### Existing Variables (unchanged)
- `NOSTR_NSEC` - Nostr private key
- `AMBOSS_API_KEY` - Amboss API key
- `COMMUNITY_ID` - Lightning Network community ID
- `NOSTR_RELAYS` - Comma-separated relay URLs (optional)

## 🔗 Links
- **Live Telegram Group**: https://nodestrich.com/tg
- **Nostr Profile**: npub1hxfkcs9gvtm49702rmwn2aeuvhkd2w6f0svm4sl84g8glhzx5u9srk5p6t
- **Landing Page**: Updated to reflect dual-platform functionality

## 📅 Deployment
- Both functions run on the same cron schedule: daily at 12pm Eastern (17:00 UTC)
- No changes to existing Nostr functionality
- Backward compatible: works with or without Telegram configuration

## 🎯 Impact
- Expands StrichBot's reach to Telegram users
- Maintains existing Nostr functionality unchanged
- Provides redundancy across platforms
- Easy setup for other communities to fork and adapt

---

**Testing Status**: ✅ Fully tested and working in production
**Breaking Changes**: None
**Migration Required**: No, fully backward compatible