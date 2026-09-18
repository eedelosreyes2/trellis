import * as Notifications from "expo-notifications";

// These are the ONLY two notifications this app ever sends. If you're
// tempted to add a third later (a deadline alert, a streak nudge), don't —
// fold it into the morning or evening content instead. That constraint is
// a deliberate product decision, not a technical limitation.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Call once after permission is granted (e.g. during onboarding).
// Uses daily calendar triggers, not intervals — these fire at a fixed local
// clock time regardless of when the app was last opened.
export async function scheduleDailyReminders(morningHour = 8, eveningHour = 20) {
  await Notifications.cancelAllScheduledNotificationsAsync(); // avoid duplicate stacking on re-schedule

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Set today's intention",
      body: "What do you want today to be about?",
      data: { screen: "today" },
    },
    trigger: { hour: morningHour, minute: 0, repeats: true },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "How did today go?",
      body: "Log a rose and a thorn before you wind down.",
      data: { screen: "today" },
    },
    trigger: { hour: eveningHour, minute: 0, repeats: true },
  });
}
