# Telegram booking link V5 — 522 fix

- Adds `IUMRAH_WEB` Cloudflare Service Binding from `anonymous-chat-bot` to `iumrah-web`.
- Bot reads/validates booking state through `/api/bookings/:id` inside Cloudflare instead of making a public Worker -> `https://iumrah.app` round-trip.
- Link-token creation no longer performs a nested web -> bot -> web validation call. The token is validated when the user claims the link in Telegram, where bot -> web is a normal one-way service call.
- Public iumrah API remains a compatibility fallback only.
