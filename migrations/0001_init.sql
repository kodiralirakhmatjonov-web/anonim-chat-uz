PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  gender TEXT CHECK (gender IN ('male', 'female')),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'waiting', 'chatting')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue (
  user_id INTEGER PRIMARY KEY,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_queue_gender_created
  ON queue(gender, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  male_user_id INTEGER NOT NULL,
  female_user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  ended_by INTEGER,
  FOREIGN KEY (male_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (female_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_male
  ON sessions(male_user_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_female
  ON sessions(female_user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sessions_active_male
  ON sessions(status, male_user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_active_female
  ON sessions(status, female_user_id);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_user_id INTEGER NOT NULL,
  reported_user_id INTEGER NOT NULL,
  session_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_user_id INTEGER NOT NULL,
  blocked_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  FOREIGN KEY (blocker_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
