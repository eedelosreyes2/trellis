// Core data model for the roses & thorns app.
// These types mirror the SQLite schema exactly — keep them in sync.

export type EntryType = "intention" | "rose" | "thorn";
export type GoalStatus = "active" | "completed" | "archived";
export type SyncStatus = "local" | "synced" | "pending";

export interface User {
  id: string; // UUID, generated on first launch
  createdAt: string; // ISO timestamp
  timezone: string; // IANA tz, e.g. "America/Los_Angeles"
}

export interface Goal {
  id: string; // UUID
  userId: string;
  title: string;
  createdAt: string; // ISO timestamp
  deadline: string | null; // local date "YYYY-MM-DD", null = open-ended
  status: GoalStatus;
}

export interface Entry {
  id: string; // UUID, generated client-side at creation
  userId: string;
  type: EntryType;
  text: string;
  localDate: string; // "YYYY-MM-DD", computed from device clock at creation — never derived from createdAt later
  createdAt: string; // ISO timestamp, ordering/audit only
  updatedAt: string; // ISO timestamp, for future last-write-wins sync
  goalId: string | null; // optional link to a Goal
  linkedIntentionId: string | null; // for rose/thorn entries, optional link back to that day's intention
  syncStatus: SyncStatus;
}

// Convenience shape for rendering a single day (used by morning/evening screens)
export interface DayEntries {
  localDate: string;
  intention: Entry | null;
  roses: Entry[];
  thorns: Entry[];
}
