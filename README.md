# iUmrah Telegram Booking Assistant

Cloudflare Worker that exposes the same booking lifecycle used by iUmrah Web/iOS/Android inside Telegram.

## What is implemented

- One-time 10 minute deep-link authorization (`t.me/<bot>?start=link_<token>`).
- Booking ownership is verified against the existing iUmrah operational trip API with `x-booking-token`.
- Booking tokens are encrypted at rest in D1 using AES-GCM. The bot does not copy booking payloads into a second booking database.
- `/start`, `/status`, `/booking` show the current server-backed booking state.
- Exact lifecycle fallback rules used by the client:
  - availability: 6 hours;
  - price lock: 30 minutes;
  - received payment confirmation: 10 minutes;
  - documents: 24 hours;
  - explicit server deadline fields always win.
- Telegram Mini App with a true second-by-second countdown.
- One-minute reconciliation cron for automatic status notifications.
- `/internal/booking-event` endpoint for immediate push when the iUmrah backend emits an event.

## Required secrets / variables

Set with `wrangler secret put` (or Cloudflare dashboard):

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `IUMRAH_TELEGRAM_BRIDGE_SECRET`
- `LINK_ENCRYPTION_KEY` (recommended; if omitted the bridge secret derives the AES key)

Variables:

- `IUMRAH_API_ORIGIN=https://iumrah.app`
- `TELEGRAM_BOT_USERNAME=<without @>`
- `PUBLIC_BASE_URL=https://<this-worker-domain>`

Keep the existing Worker name and D1 binding if this repository is already connected to Cloudflare. Replace `__D1_DATABASE_ID__` only if your deployment workflow does not inject it automatically.

## Deploy

```bash
npm install
npm run db:migrate:remote
npm run typecheck
npm run deploy
npm run webhook:set
```

## Server-to-server create-link request

The Web/iOS/Android integration should call its own trusted proxy route. That proxy sends:

```http
POST https://<bot-worker>/internal/link-token
Authorization: Bearer <IUMRAH_TELEGRAM_BRIDGE_SECRET>
Content-Type: application/json

{
  "bookingId": "IUM-2026-XXXXXXX",
  "bookingToken": "<existing x-booking-token>",
  "language": "ru"
}
```

The response contains `linkUrl` and `expiresAt`. Open `linkUrl` for the user.

## Immediate booking event

```http
POST https://<bot-worker>/internal/booking-event
Authorization: Bearer <IUMRAH_TELEGRAM_BRIDGE_SECRET>
Content-Type: application/json

{ "bookingId": "IUM-2026-XXXXXXX" }
```

Even without push integration, the one-minute cron reconciles linked bookings and notifies users on status/payment/confirmation changes.
