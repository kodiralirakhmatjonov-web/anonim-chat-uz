# Booking link authorization fix

`/internal/link-token` now authorizes creation by validating the existing iUmrah `bookingId + bookingToken` pair against the canonical trip API. This allows the Cloudflare Service Binding from `iumrah-web` to work without duplicating a shared secret in two deployments.

`/internal/booking-event` remains protected by `IUMRAH_TELEGRAM_BRIDGE_SECRET`.

Encryption-at-rest prefers `LINK_ENCRYPTION_KEY`, then `IUMRAH_TELEGRAM_BRIDGE_SECRET`, and finally the already-secret Telegram bot token as a compatibility fallback. Setting a dedicated `LINK_ENCRYPTION_KEY` remains recommended for long-term stability.
