# Iumrah Telegram Bot V7.9 — Sync consistency / stale binding cleanup

Cumulative bot-only patch over V7.5. Includes V7.6, V7.7 and V7.8 behavior.

## Root cause fixed
The Telegram user had multiple rows in `telegram_bookings`: one current booking that still resolves on the canonical server and older/stale bindings that no longer resolve. `showBookings()` rendered the valid booking and then emitted one recovery error for every stale row, which looked like contradictory duplicate sync failures.

## Changes
- `showBookings()` now validates all linked rows first while rendering live bookings normally.
- Canonically missing / no-longer-authorized Telegram bindings are removed from Telegram D1 only. Main booking data is never deleted.
- If at least one live booking succeeds, stale binding errors are suppressed instead of being mixed with the valid status card.
- If no booking can be read, only one recovery error card is sent instead of several near-identical errors.
- Manual refresh removes only the broken Telegram binding when the server returns missing/invalid authorization, then sends one recovery card.
- Cron reconciliation and booking-event reconciliation also clean stale Telegram bindings so they do not keep failing forever.
- Server response handling now distinguishes `BOOKING_NOT_FOUND` (404) from `BOOKING_AUTH_INVALID` (401/403).
- Status and support artwork is uploaded to Telegram directly as multipart bytes from the embedded Worker assets. Telegram no longer has to fetch the image back from a public Worker URL, eliminating the blank/white media-card failure mode seen on iOS.

## Health
- version: `1.7.4`
- directServer: `true`
- packageBinding: unchanged

## Changed files
- `src/index.ts`
- `src/support-assets.ts`
