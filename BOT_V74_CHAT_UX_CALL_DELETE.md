# iumrah Telegram Bot V7.4

Production patch built cumulatively over the currently deployed V7.2.1/V7.2 line and includes the un-deployed V7.3 deletion fix.

## Mini App
- Care Chat button/page remains removed from navigation.
- Care call action now uses a direct `tel:` anchor from the user tap instead of a JavaScript redirect.
- Care info sheet call action also uses `tel:`.
- Mini App accepts `?tab=booking`, `?tab=status`, and `?tab=care` deep links.
- Booking deletion uses the V7.3 confirmation sheet and canonical `DELETE /api/bookings/:id` flow.

## Bot chat UX
- `/start` shows 4-language selector: RU / EN / UZ Latin / UZ Cyrillic.
- User language persists in D1 and also updates linked booking language.
- A localized persistent reply keyboard is installed:
  - Open Mini App
  - Booking status
  - iumrah Care
- The Telegram chat menu button is set to the Mini App for the selected locale.
- A localized Mini App tracking message is sent and pinned in the private chat; existing pinned message is reused/edited.
- Booking status cards now prioritize `Open Mini App`, then `Refresh` + `iumrah Care`.
- `/language` reopens language selection.
- Support button opens a localized Care card with direct Mini App Care access.

## Backend state
- `telegram_user_preferences` is created lazily with `CREATE TABLE IF NOT EXISTS`; no manual D1 migration step is required.
- Health version: `1.6.0`.

## Web dependency
Booking deletion requires the companion `iumrah-update.zip` that adds `DELETE /api/bookings/[id]` to the web worker. Deploy web patch before testing delete.
