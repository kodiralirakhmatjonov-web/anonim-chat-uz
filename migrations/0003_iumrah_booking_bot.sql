PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  token_hash TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  booking_token_ciphertext TEXT NOT NULL,
  booking_token_iv TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ru',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_expiry
  ON telegram_link_tokens(expires_at, used_at);

CREATE TABLE IF NOT EXISTS telegram_bookings (
  telegram_user_id INTEGER NOT NULL,
  chat_id INTEGER NOT NULL,
  booking_id TEXT NOT NULL,
  booking_token_ciphertext TEXT NOT NULL,
  booking_token_iv TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ru',
  last_status TEXT,
  last_payment_status TEXT,
  last_confirmation_number TEXT,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  linked_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (telegram_user_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_bookings_booking
  ON telegram_bookings(booking_id, notifications_enabled);

CREATE INDEX IF NOT EXISTS idx_telegram_bookings_reconcile
  ON telegram_bookings(notifications_enabled, updated_at);

CREATE TABLE IF NOT EXISTS bot_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
