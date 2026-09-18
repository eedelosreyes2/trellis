import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import type { User, Goal, Entry, EntryType, DayEntries } from "./types";
import { SCHEMA_SQL } from "./schema";

const DB_NAME = "trellis.db";
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

// Call once on app startup, before rendering any screen.
export async function initDb() {
  const db = await getDb();
  await db.execAsync(SCHEMA_SQL);
}

// --- Local date helper -----------------------------------------------------
// Deliberately NOT toISOString() — that converts to UTC and can shift the
// date near midnight. This uses the device's local calendar date, which is
// what "which day does this entry belong to" should always mean.
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nowIso() {
  return new Date().toISOString();
}

// --- User --------------------------------------------------------------
export async function getOrCreateUser(timezone: string): Promise<User> {
  const db = await getDb();
  const existing = await db.getFirstAsync<any>("SELECT * FROM users LIMIT 1");
  if (existing) {
    return { id: existing.id, createdAt: existing.created_at, timezone: existing.timezone };
  }
  const user: User = { id: Crypto.randomUUID(), createdAt: nowIso(), timezone };
  await db.runAsync(
    "INSERT INTO users (id, created_at, timezone) VALUES (?, ?, ?)",
    user.id,
    user.createdAt,
    user.timezone
  );
  return user;
}

// --- Entries -------------------------------------------------------------
export async function createEntry(params: {
  userId: string;
  type: EntryType;
  text: string;
  goalId?: string | null;
  linkedIntentionId?: string | null;
  localDate?: string; // defaults to today; override only for tests/backfill
}): Promise<Entry> {
  const db = await getDb();
  const timestamp = nowIso();
  const entry: Entry = {
    id: Crypto.randomUUID(),
    userId: params.userId,
    type: params.type,
    text: params.text,
    localDate: params.localDate ?? getLocalDateString(),
    createdAt: timestamp,
    updatedAt: timestamp,
    goalId: params.goalId ?? null,
    linkedIntentionId: params.linkedIntentionId ?? null,
    syncStatus: "local",
  };
  await db.runAsync(
    `INSERT INTO entries
      (id, user_id, type, text, local_date, created_at, updated_at, goal_id, linked_intention_id, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.userId,
    entry.type,
    entry.text,
    entry.localDate,
    entry.createdAt,
    entry.updatedAt,
    entry.goalId,
    entry.linkedIntentionId,
    entry.syncStatus
  );
  return entry;
}

// Powers both the morning screen (show today's intention if it exists)
// and the evening screen (recap + roses/thorns for today).
export async function getEntriesForDate(userId: string, localDate: string): Promise<DayEntries> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM entries WHERE user_id = ? AND local_date = ? ORDER BY created_at ASC",
    userId,
    localDate
  );
  const mapped: Entry[] = rows.map(rowToEntry);
  return {
    localDate,
    intention: mapped.find((e) => e.type === "intention") ?? null,
    roses: mapped.filter((e) => e.type === "rose"),
    thorns: mapped.filter((e) => e.type === "thorn"),
  };
}

function rowToEntry(row: any): Entry {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    text: row.text,
    localDate: row.local_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    goalId: row.goal_id,
    linkedIntentionId: row.linked_intention_id,
    syncStatus: row.sync_status,
  };
}

// --- Goals -----------------------------------------------------------------
export async function createGoal(params: {
  userId: string;
  title: string;
  deadline?: string | null;
}): Promise<Goal> {
  const db = await getDb();
  const goal: Goal = {
    id: Crypto.randomUUID(),
    userId: params.userId,
    title: params.title,
    createdAt: nowIso(),
    deadline: params.deadline ?? null,
    status: "active",
  };
  await db.runAsync(
    "INSERT INTO goals (id, user_id, title, created_at, deadline, status) VALUES (?, ?, ?, ?, ?, ?)",
    goal.id,
    goal.userId,
    goal.title,
    goal.createdAt,
    goal.deadline,
    goal.status
  );
  return goal;
}

// Sorted soonest-deadline-first, then no-deadline goals — matches the tap-to-link list order.
export async function getActiveGoals(userId: string): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM goals WHERE user_id = ? AND status = 'active'
     ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END, deadline ASC`,
    userId
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    createdAt: r.created_at,
    deadline: r.deadline,
    status: r.status,
  }));
}

// Powers the morning banner. daysAhead=3 means "due within 3 days, or overdue".
export async function getGoalsNearingDeadline(userId: string, daysAhead = 3): Promise<Goal[]> {
  const all = await getActiveGoals(userId);
  const cutoff = getLocalDateString(new Date(Date.now() + daysAhead * 86400000));
  // Includes overdue goals (deadline < today) as well as ones due within the window —
  // both cases deserve the banner, and "deadline <= cutoff" already covers both.
  return all.filter((g) => g.deadline !== null && g.deadline <= cutoff);
}

export async function setGoalStatus(goalId: string, status: Goal["status"]) {
  const db = await getDb();
  await db.runAsync("UPDATE goals SET status = ? WHERE id = ?", status, goalId);
}

// Used for same-day intention edits — updates in place rather than creating
// a second row, since "one intention per day" only holds if edits don't fork it.
export async function updateEntryText(entryId: string, text: string, goalId?: string | null) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE entries SET text = ?, goal_id = ?, updated_at = ? WHERE id = ?",
    text,
    goalId ?? null,
    new Date().toISOString(),
    entryId
  );
}
