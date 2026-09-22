# Iumrah Telegram Mini App V7.2 — Booking / Status / iumrah Care

Source of truth for this release:
- iOS `RootView.swift`
- iOS `CareHomeView.swift`
- iOS `BookingChatView.swift`
- iOS `CareContactInfoView.swift`
- iOS `CareChatAppearance.swift`
- iOS `ChatService.swift`

## Bottom navigation

The Mini App now has a persistent three-item bottom dock:
1. Booking
2. Status
3. iumrah Care

Booking and Status preserve the V7.1 booking functionality. Care is a full third product area rather than an outbound link.

## iumrah Care home parity

The Care root screen mirrors the iOS structure:
- `iumrah Care` root title
- localized intro and explanatory copy
- original `IumrahCareTeamHero` image
- Chat / Call / Telegram action tiles
- active-booking context card
- locked-chat explanation when no active booking exists
- “How we can help” rows: flight, hotel, transfer, booking changes
- localized quick answers

All Care copy is available in RU, EN, UZ Latin and UZ Cyrillic.

## Booking-bound Care chat

Care chat is available only for a Telegram user with an active linked booking. It uses the same iumrah server chat routes as iOS:
- load booking messages
- send text messages
- upload JPEG/image attachments
- fetch protected attachments
- best-effort read receipt update
- 6-second foreground reconciliation while the Care conversation is open

Telegram `initData` is verified on the Worker. The booking credential remains server-side and is never exposed to Mini App JavaScript.

## Care profile / chat appearance

The Care info sheet includes:
- original `CareChatAvatar`
- Call / Telegram / WhatsApp actions
- founder-connect state, persisted per booking in Mini App local preferences
- booking reference
- Chat sounds toggle
- Haptics toggle
- background selector
- custom photo wallpaper
- Color / Sky / Water / Aurora choices
- Makkah / Sand / Aurora / Water suggestion cards

The selected wallpaper and Care presentation preferences persist locally per booking where appropriate.

## Cupertino Icons

Cupertino Icons are fully self-hosted in the bot Worker. The release embeds the official `CupertinoIcons.ttf` asset from `cupertino_icons 1.0.9` and serves it via `/mini-asset/cupertino-icons.ttf`.

V7.2 also corrects the web icon registry to use the real Cupertino glyph codepoints rather than text/ligature names. The codepoints used by the UI were validated against the embedded font cmap.

## Embedded iOS Care assets

The Worker contains the iOS Care assets required by these screens, including:
- `care-team-hero.jpeg`
- `care-chat-avatar.png`
- `care-mark.png`
- `care-showcase.jpeg`
- `care-price-support.jpeg`
- local Cupertino Icons font

## Worker endpoints added/used

- `POST /mini/care/messages`
- `POST /mini/care/send`
- `POST /mini/care/photo`
- `POST /mini/care/attachment`
- `GET /mini-asset/...`

Worker `/health` version: `1.4.0`.

## Scope

This release intentionally changes only the booking/status/Care area requested for the Telegram Mini App. It does not add unrelated iOS tabs or duplicate the full iOS application.
