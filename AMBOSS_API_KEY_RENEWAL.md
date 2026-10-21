# ⏰ Renew Amboss API Key — expires 2027-10-16

Remind Daniel around **2027-10-01** (2 weeks before expiry).

## Why it matters
StrichBot's weekly nostr + telegram posts use the Amboss API key for pending-member
counts. Public stats post fine without it (since fix `dd107bd`, Oct 2026), but an
expired key silently drops the "+N pending" suffix — no error, no warning
(`api/check-api-key.js` exists but is not on any cron). Last expiry (2026-09-16)
went unnoticed for 5 weeks.

## Renewal (~5 min)
1. Log in to [amboss.space](https://amboss.space) → account/API settings → generate
   new API key. Note the new expiry date.
2. Update `AMBOSS_API_KEY` and `AMBOSS_API_KEY_EXPIRY_DATE` in `.env`, then copy
   `.env` → `.env.local`.
3. Replace on Vercel — sensitive vars can't be updated, only removed and re-added:
   ```sh
   vercel env rm AMBOSS_API_KEY production --yes
   vercel env rm AMBOSS_API_KEY preview --yes
   printf '%s' "$NEW_KEY" | vercel env add AMBOSS_API_KEY production
   printf '%s' "$NEW_KEY" | vercel env add AMBOSS_API_KEY preview
   ```
4. Redeploy (env changes only apply to new deployments):
   ```sh
   vercel deploy --prod --yes
   ```
5. Verify: `curl https://strichbot.vercel.app/api/stats` — response should include
   a `pendingRequests` count from source "Amboss".
