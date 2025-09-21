# StrichBot ♾️🤖⚡

A Nostr bot that periodically posts Nodestrich community statistics from Amboss.space.

## Features

- Posts Lightning Network statistics for the Nodestrich community
- Fetches data from Amboss.space API
- Publishes to Nostr network daily at 12am Eastern
- Deployed on Vercel with automated cron jobs

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

The bot automatically runs daily at 12am Eastern via Vercel cron jobs when deployed.

## License

MIT