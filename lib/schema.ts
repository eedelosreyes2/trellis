// This is the runtime source of truth for the schema — schema.sql is kept
// alongside it purely as a human-readable reference. If you change one,
// change both; there's no build step wiring them together automatically.

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  timezone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  local_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  goal_id TEXT REFERENCES goals(id),
  linked_intention_id TEXT REFERENCES entries(id),
  sync_status TEXT NOT NULL DEFAULT 'local'
);

CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
`;
