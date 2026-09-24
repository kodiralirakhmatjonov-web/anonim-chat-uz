# Iumrah Telegram Bot V8.0 — Care photo card + notification dedup

Cumulative bot-only patch over V7.9.

## Included
- `iumrah Care` now sends a **photo card** instead of a plain text-only message.
- The provided care-team artwork is embedded directly into the Worker and sent through Telegram `sendPhoto` multipart upload.
- Added notification deduplication table `telegram_notification_dedup`.
- Scheduled reconciliation no longer re-sends the same booking status every 5 minutes when the visible booking snapshot has not changed.
- Manual status open / refresh updates the dedup fingerprint too, so the cron job does not echo the same state right after a manual check.
- When a Telegram booking binding is removed, its dedup record is removed as well.

## Files
- `src/index.ts`
- `src/support-assets.ts`
- `BOT_V80_CARE_DEDUP.md`

## Health
- version: `1.7.5`
