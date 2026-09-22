# iumrah Telegram Mini App V7 — iOS Booking parity

Source of truth: `kepler-ios-main(6)`.

Ported scope only:
- `Sources/Views/Tabs/BookingsHomeView.swift`
- `Sources/Views/Booking/BookingDetailView.swift`
- booking lifecycle logic from `StoredBookingSession` / `BookingStore`
- canonical booking payload from `/api/bookings/{id}`
- linked Telegram booking token stays server-side

## Booking tab parity
- iumrah wordmark header + Makkah time
- Booking / Booking status segmented control
- Active / Past segmented control
- booking identity block
- seven-stage booking progress
- active-stage status card
- server lifecycle countdown with 6h / 30m / 10m / 24h fallbacks
- What to do next cards
- trip-plan preview
- trip-management rows
- other linked trips
- RU / EN / UZ / UZ Cyrillic

## Booking detail parity
- booking pass / identity card
- status hero
- lifecycle timer
- booking metadata and total
- Makkah / Madinah hotel cards with disclosure
- transfer card
- guide card
- ziyarat switches
- iumrah Mobile eSIM switch
- contacts card/edit sheet
- iumrah Care card
- cancel/delete action

## Mini App security
- no booking token is exposed to WebView JS
- Telegram `initData` is HMAC-validated in Worker
- linked booking token is decrypted only server-side
- Mini App data is available only to the Telegram user linked to that booking

## New Worker routes
- `POST /mini/bootstrap`
- `POST /mini/action`
- `GET /mini-asset/*`
- existing `GET /mini`

Health version: `1.2.0`.
