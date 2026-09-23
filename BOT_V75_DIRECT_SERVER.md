# iumrah Telegram Bot V7.5 — Direct Server

## Architecture
- Mini App and bot mutations no longer require a website code update.
- Package booking mutations call `iumrah-package-api` directly through the `IUMRAH_PACKAGE_API` Cloudflare Service Binding.
- Public server routes remain compatibility fallbacks.
- Existing `IUMRAH_WEB` is retained only as a read fallback for the already-deployed `/api/bookings/:id` GET route.

## Permanent booking deletion
Deletion now targets both server layers:
1. `DELETE /api/catalog/hotels/client/bookings/:id` — operational/client booking cleanup when available.
2. `DELETE /api/package/booking/:id` — canonical PackageEngine hard delete through direct Service Binding.

The Telegram booking/link rows are deleted only after server deletion succeeds (or both server layers report the booking already absent).

## Care call
Telegram Mini Apps do not reliably launch `tel:` from the embedded WebView. V7.5 replaces it with a native bot flow:
- Mini App POST `/mini/care/call`
- Worker validates Telegram initData and linked booking
- Worker sends an `iumrah Care` Telegram contact card to the same chat
- Mini App closes back to the bot chat

## Health
`/health` version: `1.7.0`
Expected fields:
- `directServer: true`
- `packageBinding: true`
