import React, { createContext, useContext, useEffect, useState } from "react";
import * as Localization from "expo-localization";
import { initDb, getOrCreateUser } from "./db";

type SessionState =
  | { status: "loading" }
  | { status: "ready"; userId: string }
  | { status: "error"; error: string };

const SessionContext = createContext<SessionState>({ status: "loading" });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDb();
        const timezone = Localization.getCalendars()[0]?.timeZone ?? "UTC";
        const user = await getOrCreateUser(timezone);
        if (!cancelled) setState({ status: "ready", userId: user.id });
      } catch (err: any) {
        if (!cancelled) setState({ status: "error", error: String(err?.message ?? err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

// Screens call this instead of touching db.ts init logic directly —
// it guarantees the DB is ready before any query runs.
export function useSession() {
  return useContext(SessionContext);
}
