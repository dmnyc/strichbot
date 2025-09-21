# StrichBot ♾️🤖⚡

A Nostr bot that periodically posts Nodestrich community statistics from Amboss.space.

**🌐 Website**: [strichbot.vercel.app](https://strichbot.vercel.app)
**🟣 Nostr**: [npub1hxfkcs9gvtm49702rmwn2aeuvhkd2w6f0svm4sl84g8glhzx5u9srk5p6t](https://jumble.social/users/npub1hxfkcs9gvtm49702rmwn2aeuvhkd2w6f0svm4sl84g8glhzx5u9srk5p6t)

## Features

- Posts Lightning Network statistics for the Nodestrich community
- Fetches data from Amboss.space API
- Publishes to Nostr network daily at 12pm Eastern
- Deployed on Vercel with automated cron jobs
- Skips posting if live data is unavailable (no fallback data)

## Statistics Posted

- Member count
- Total channels
- Total capacity (BTC)
- Community rank
- Additional metrics from Amboss

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure:
   - `NOSTR_NSEC`: Your bot's private key (starts with nsec1)
   - `AMBOSS_API_KEY`: Optional API key from Amboss.space
4. Deploy to Vercel: `vercel`

## Environment Variables

Set these in your Vercel dashboard:

- `NOSTR_NSEC`: Your bot's Nostr private key
- `AMBOSS_API_KEY`: Amboss API key (optional)
- `NOSTR_RELAYS`: Comma-separated list of relay URLs

## Development

Run locally: `npm run dev`

## Deployment

The bot automatically runs daily at 12pm Eastern via Vercel cron jobs when deployed.

## License

MIT