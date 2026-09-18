-- v1 schema. IDs are client-generated UUIDs (TEXT), never AUTOINCREMENT —
-- this is what makes offline creation safe to sync later without collisions.

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
  deadline TEXT,                 -- "YYYY-MM-DD", nullable
  status TEXT NOT NULL DEFAULT 'active'  -- active | completed | archived
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,             -- intention | rose | thorn
  text TEXT NOT NULL,
  local_date TEXT NOT NULL,       -- "YYYY-MM-DD" — the source of truth for "what day is this"
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  goal_id TEXT REFERENCES goals(id),
  linked_intention_id TEXT REFERENCES entries(id),
  sync_status TEXT NOT NULL DEFAULT 'local'  -- local | synced | pending
);

-- Every screen in the app filters by (user, day) or (user, active goals) —
-- these two indices cover both without a full table scan.
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
