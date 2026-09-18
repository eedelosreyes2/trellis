# Trellis — v1 skeleton

## Structure

```
app/
  _layout.tsx           root layout, wraps everything in SessionProvider
  (tabs)/
    _layout.tsx          tab bar: Today, Goals
    index.tsx            adaptive Today screen (morning / evening / done)
    goals.tsx             goals list + create + complete
lib/
  types.ts               shared TypeScript types
  schema.ts               SQLite schema (runtime source of truth)
  schema.sql              same schema, human-readable reference — keep both in sync
  db.ts                    all database operations
  session.tsx             inits DB, resolves current user, exposes via context
  notifications.ts        the two — and only two — local notifications
```

## Running it

```
npm install
npx expo start
```

Requires Expo Go on your phone, or an iOS/Android simulator.

## What's real vs. stubbed

- Data layer (`lib/`) is functional as written.
- Screens are functional but minimally styled — this is a skeleton to build the
  real UI on top of, not a finished look.
- Notifications: `scheduleDailyReminders()` exists but isn't called anywhere
  yet — wire it into an onboarding flow once you're ready to ask for permission.
- Goal deadline entry is a raw text field expecting `YYYY-MM-DD` — no picker,
  no validation. Fine for your own testing; swap in a real date picker before
  anyone else touches this.
- No backend, no sync, no auth. By design — see the architecture discussion:
  those come after the local loop is something you actually use.

## Known gap worth deciding before you build further

`getEntriesForDate` and the Today screen assume "one intention per day."
If you ever let someone edit an already-set intention, decide now whether
that's an update to the same row or a new row — the current schema supports
either, but the screen logic doesn't yet handle "intention already exists,
let me edit it."
