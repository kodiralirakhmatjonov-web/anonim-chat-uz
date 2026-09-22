# iumrah Telegram Mini App — Booking V7.1 Production

## Scope
Only the Booking tab and Booking Detail flow from the iOS app are implemented here. No unrelated product tabs are added.

## UI parity / polish
- Cupertino Icons are used for functional UI icons throughout the Mini App.
- Apple/Tripsy-like spacing, 28px cards, rounded controls, segmented controls, sheets and action buttons.
- Booking Home and Booking Detail keep the same status/timer hierarchy as iOS.
- Existing branded iumrah assets remain used for wordmark, eSIM and Care.

## Hotel booking — now native inside Telegram Mini App
- Existing Makkah/Madinah hotel cards show canonical hotel cover images when available.
- Change Hotel opens an in-app bottom sheet instead of redirecting to the website.
- Hotel catalog is loaded from the same iumrah backend through the Cloudflare Service Binding.
- Each result shows real cover image, hotel name, stars, rating and city.
- Hotel detail opens inside the Mini App with an image gallery, address, rating, room inventory and room categories.
- User can choose hotel + room/category and save the change directly to the same booking.
- Server re-fetches canonical hotel/room data before PATCHing the booking, so the client cannot spoof hotel metadata.

## Booking mutations inside Mini App
- Change Makkah hotel
- Change Madinah hotel
- Choose room / category
- Ziyarat toggles
- eSIM toggle
- Telegram / WhatsApp contacts
- Delete/cancel booking

## Security
Telegram `initData` is verified server-side. The booking token never reaches Mini App JavaScript. All booking data and mutations are performed by the Worker after resolving the linked Telegram user and encrypted booking token.

## Localization
RU / EN / UZ Latin / UZ Cyrillic are supported in the Booking Mini App.

## Worker API additions
- `POST /mini/hotels`
- `POST /mini/hotel`
- `POST /mini/action` action=`hotel`

## Health version
`1.3.0`
