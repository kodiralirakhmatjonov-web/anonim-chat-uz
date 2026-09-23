# Iumrah Telegram Bot V7.7 — Live Support + Sync Recovery (cumulative)

This update is cumulative over V7.5 and includes the V7.6 sync-recovery changes plus a new **Live Support** flow.

## Included
- V7.6 sync recovery preserved:
  - failed booking refresh messages now show **Connect Telegram** linking to
    `https://iumrah.app/telegram#telegram-connect`
  - **Call iumrah Care** sends a real Telegram contact card instead of relying on `tel:` inside the WebView
  - direct-server logging for booking sync / refresh failures
- New **Live Support** button in the persistent Telegram keyboard and pinned-message actions
- Live Support sends two rich support cards with artwork:
  1. **Call support** → bot sends the phone contact card
  2. **Write in Telegram** → opens the direct Telegram link `https://t.me/saudiclub966`
- Support artwork is bundled directly in the Worker via `src/support-assets.ts`
- New Worker routes:
  - `/support-image/call.jpg`
  - `/support-image/telegram.jpg`
- Health version bumped to **1.7.2**

## Changed files
- `src/index.ts`
- `src/support-assets.ts`

No site patch is required. This is a bot-only update.
