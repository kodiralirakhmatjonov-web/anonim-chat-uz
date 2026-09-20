# Booking link fix v4

The Telegram Worker now validates the existing booking token against the operational trip endpoint first. If the trip mirror has not synchronized yet, it safely falls back to `/api/bookings/{id}` using the same booking token. This keeps immediate Telegram linking available after web checkout without creating a second booking authority.
