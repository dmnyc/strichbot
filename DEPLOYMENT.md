# StrichBot Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Nostr Private Key**: Generate a new nsec key for your bot
3. **Amboss API Key**: Get from [amboss.space](https://amboss.space) account settings (required for live data)

## Step 1: Generate Nostr Keys

You can generate a new Nostr key pair using any Nostr client or online tool:

1. Visit [nostr-keygen.com](https://nostr-keygen.com) or use a Nostr client
2. Generate a new key pair
3. Save the **nsec** (private key) - this is what you'll use for `NOSTR_NSEC`
4. Save the **npub** (public key) - this is your bot's public identity

⚠️ **Important**: Keep your nsec private and secure!

## Step 2: Deploy to Vercel

### Option A: Deploy from Git Repository

1. Push your code to GitHub/GitLab
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your repository
5. Vercel will automatically detect the project configuration

### Option B: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the project directory
vercel

# Follow the prompts to set up your project
```

## Step 3: Configure Environment Variables

In your Vercel dashboard:

1. Go to your project
2. Click "Settings" → "Environment Variables"
3. Add the following variables:

| Variable Name | Value | Required |
|---------------|-------|----------|
| `NOSTR_NSEC` | Your bot's private key (starts with nsec1) | ✅ Yes |
| `AMBOSS_API_KEY` | Your Amboss API key | ✅ Yes |
| `COMMUNITY_ID` | Lightning Network community ID from Amboss | ✅ Yes |
| `NOSTR_RELAYS` | Comma-separated relay URLs | ❌ Optional |

### Default Relays

If you don't set `NOSTR_RELAYS`, these default relays will be used:
- `wss://relay.damus.io`
- `wss://relay.snort.social`
- `wss://nostr.wine`
- `wss://nos.lol`
- `wss://nostr.land`
- `wss://nostr.bitcoiner.social`
- `wss://relay.primal.net`

## Step 4: Enable Cron Jobs

The `vercel.json` file already configures a cron job to run daily at 12pm Eastern:

```json
{
  "crons": [
    {
      "path": "/api/post-stats",
      "schedule": "0 17 * * *"
    }
  ]
}
```

This will automatically run when deployed to Vercel.

## Step 5: Test the Deployment

### Manual Test

Visit your deployed function URL:
```
https://your-project.vercel.app/api/post-stats
```

### Check Logs

1. Go to Vercel dashboard
2. Select your project
3. Click on "Functions" tab
4. Click on the function execution to see logs

## Step 6: Monitor Your Bot

### Find Your Bot on Nostr

1. Use the **npub** from Step 1 to find your bot
2. Open any Nostr client (Damus, Snort, Amethyst, etc.)
3. Search for your bot's npub
4. Follow the bot to see its posts

**StrichBot Nostr Profile**: [npub1hxfkcs9gvtm49702rmwn2aeuvhkd2w6f0svm4sl84g8glhzx5u9srk5p6t](https://jumble.social/users/npub1hxfkcs9gvtm49702rmwn2aeuvhkd2w6f0svm4sl84g8glhzx5u9srk5p6t)

### Check Function Logs

Monitor the Vercel function logs to ensure the bot is running correctly.

## Troubleshooting

### Common Issues

1. **"NOSTR_NSEC environment variable is required"**
   - Make sure you've set the `NOSTR_NSEC` environment variable in Vercel
   - Ensure the value starts with `nsec1`

2. **"Failed to publish to relay"**
   - Some relays may be temporarily down
   - The bot will try all configured relays and succeed if at least one works

3. **"Amboss API error"** or **"No statistics available - post skipped"**
   - Ensure `AMBOSS_API_KEY` is set (required for API access)
   - Ensure `COMMUNITY_ID` is set correctly
   - The bot will skip posting if live data is unavailable (no fallback data)

### Environment Variables Format

```bash
# Example values
NOSTR_NSEC=nsec1abcd1234...
AMBOSS_API_KEY=your-api-key-here
COMMUNITY_ID=6d41c0bd-6e39-40a2-a062-a809c2e8c2b5
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.snort.social,wss://nostr.wine,wss://nos.lol,wss://nostr.land,wss://nostr.bitcoiner.social,wss://relay.primal.net
```

## Customization

### Change Posting Schedule

Edit the `schedule` in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/post-stats",
      "schedule": "0 17 * * *"  // Daily at 12pm Eastern (5pm UTC)
    }
  ]
}
```

### Modify Message Format

Edit the `formatStatsMessage` function in `lib/nostr.js` to customize the post format.

## Security Notes

- Never commit your `.env` file or expose your nsec
- Use Vercel's environment variables for all secrets
- The nsec gives full control over your bot's Nostr identity
- Consider using a dedicated nsec just for the bot