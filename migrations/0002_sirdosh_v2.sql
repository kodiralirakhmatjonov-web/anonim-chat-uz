PRAGMA foreign_keys = ON;

-- Sirdosh V2 keeps the original users/sessions/blocks model intact and adds
-- asynchronous discovery, confirmations, language/onboarding and safety state.
ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'ru';
ALTER TABLE users ADD COLUMN language_selected INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN age_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN intent TEXT;
ALTER TABLE users ADD COLUMN intro_text TEXT;
ALTER TABLE users ADD COLUMN pending_action TEXT;
ALTER TABLE users ADD COLUMN last_active_at TEXT NOT NULL DEFAULT '1970-01-01 00:00:00';
ALTER TABLE users ADD COLUMN trust_score INTEGER NOT NULL DEFAULT 100;

ALTER TABLE sessions ADD COLUMN text_message_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN media_unlocked INTEGER NOT NULL DEFAULT 0;

-- The repository is being moved to a new Telegram bot token/brand. Clear only
-- ephemeral legacy matchmaking state so old sessions cannot appear in Sirdosh.
DELETE FROM queue;
UPDATE sessions
SET status = 'ended', ended_at = COALESCE(ended_at, CURRENT_TIMESTAMP)
WHERE status = 'active';
UPDATE users
SET gender = NULL,
    status = 'idle',
    language = 'ru',
    language_selected = 0,
    age_confirmed = 0,
    intent = NULL,
    intro_text = NULL,
    pending_action = NULL,
    last_active_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS match_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('live', 'inbox')),
  user_a_id INTEGER NOT NULL,
  user_b_id INTEGER NOT NULL,
  user_a_accepted INTEGER NOT NULL DEFAULT 0,
  user_b_accepted INTEGER NOT NULL DEFAULT 0,
  user_a_accepted_at TEXT,
  user_b_accepted_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'declined', 'expired', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  decided_at TEXT,
  FOREIGN KEY (user_a_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_offers_a_status
  ON match_offers(user_a_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_match_offers_b_status
  ON match_offers(user_b_id, status, expires_at);

CREATE TABLE IF NOT EXISTS intro_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL UNIQUE,
  language TEXT NOT NULL,
  intent TEXT NOT NULL,
  intro_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_intro_cards_discovery
  ON intro_cards(status, language, intent, expires_at, created_at);

CREATE TABLE IF NOT EXISTS match_skips (
  user_id INTEGER NOT NULL,
  skipped_user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, skipped_user_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (skipped_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_skips_expiry
  ON match_skips(user_id, expires_at);

CREATE TABLE IF NOT EXISTS session_media_consents (
  session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  consented INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evening_signups (
  user_id INTEGER NOT NULL,
  event_date TEXT NOT NULL,
  notified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, event_date),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evening_signups_date
  ON evening_signups(event_date, notified_at);
