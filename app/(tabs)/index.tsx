import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSession } from "../../lib/session";
import {
  getLocalDateString,
  getEntriesForDate,
  getGoalsNearingDeadline,
  createEntry,
  updateEntryText,
  getActiveGoals,
} from "../../lib/db";
import type { DayEntries, Goal, Entry } from "../../lib/types";

export default function TodayScreen() {
  const session = useSession();

  if (session.status === "loading") return <Centered text="Loading..." />;
  if (session.status === "error") return <Centered text={`Something went wrong: ${session.error}`} />;

  return <TodayContent userId={session.userId} />;
}

function TodayContent({ userId }: { userId: string }) {
  const today = getLocalDateString();
  const [day, setDay] = useState<DayEntries | null>(null);
  const [nearingDeadline, setNearingDeadline] = useState<Goal[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);

  const refresh = useCallback(async () => {
    const [d, deadlineGoals, goals] = await Promise.all([
      getEntriesForDate(userId, today),
      getGoalsNearingDeadline(userId),
      getActiveGoals(userId),
    ]);
    setDay(d);
    setNearingDeadline(deadlineGoals);
    setActiveGoals(goals);
  }, [userId, today]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!day) return <Centered text="Loading today..." />;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      {nearingDeadline.map((g) => (
        <View key={g.id} style={{ padding: 12, backgroundColor: "#FAEEDA", borderRadius: 8 }}>
          <Text>{g.title} — due {g.deadline}</Text>
        </View>
      ))}

      {!day.intention ? (
        <MorningForm userId={userId} goals={activeGoals} onSaved={refresh} />
      ) : day.roses.length === 0 && day.thorns.length === 0 ? (
        <View style={{ gap: 16 }}>
          <MorningForm
            userId={userId}
            goals={activeGoals}
            existing={day.intention}
            onSaved={refresh}
          />
          <EveningForm userId={userId} intention={day.intention} onSaved={refresh} />
        </View>
      ) : (
        <DoneState day={day} />
      )}
    </ScrollView>
  );
}

function MorningForm({
  userId,
  goals,
  existing,
  onSaved,
}: {
  userId: string;
  goals: Goal[];
  existing?: Entry;
  onSaved: () => void;
}) {
  const [text, setText] = useState(existing?.text ?? "");
  const [goalId, setGoalId] = useState<string | null>(existing?.goalId ?? null);

  async function save() {
    if (!text.trim()) return; // don't save an empty intention
    if (existing) {
      await updateEntryText(existing.id, text.trim(), goalId);
    } else {
      await createEntry({ userId, type: "intention", text: text.trim(), goalId });
    }
    onSaved();
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "500" }}>
        {existing ? "Edit today's intention" : "What's today about?"}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Today I want to focus on..."
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }}
      />
      {goals.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: "#666" }}>Link to a goal (optional)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {goals.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => setGoalId(goalId === g.id ? null : g.id)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: goalId === g.id ? "#7F77DD" : "#eee",
                }}
              >
                <Text style={{ color: goalId === g.id ? "#fff" : "#333" }}>{g.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <Pressable onPress={save} style={{ backgroundColor: "#1D9E75", padding: 14, borderRadius: 8 }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          {existing ? "Update intention" : "Set intention"}
        </Text>
      </Pressable>
    </View>
  );
}

function EveningForm({
  userId,
  intention,
  onSaved,
}: {
  userId: string;
  intention: Entry;
  onSaved: () => void;
}) {
  const [rose, setRose] = useState("");
  const [thorn, setThorn] = useState("");

  async function save() {
    if (rose.trim()) {
      await createEntry({
        userId,
        type: "rose",
        text: rose.trim(),
        goalId: intention.goalId,
        linkedIntentionId: intention.id,
      });
    }
    if (thorn.trim()) {
      await createEntry({
        userId,
        type: "thorn",
        text: thorn.trim(),
        goalId: intention.goalId,
        linkedIntentionId: intention.id,
      });
    }
    onSaved();
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ padding: 12, backgroundColor: "#f2f2f2", borderRadius: 8 }}>
        <Text style={{ fontSize: 12, color: "#666" }}>This morning you said:</Text>
        <Text>{intention.text}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: "500" }}>Rose — a highlight from today</Text>
      <TextInput
        value={rose}
        onChangeText={setRose}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }}
      />
      <Text style={{ fontSize: 16, fontWeight: "500" }}>Thorn — something hard today</Text>
      <TextInput
        value={thorn}
        onChangeText={setThorn}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }}
      />
      <Pressable onPress={save} style={{ backgroundColor: "#1D9E75", padding: 14, borderRadius: 8 }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>Save today</Text>
      </Pressable>
    </View>
  );
}

function DoneState({ day }: { day: DayEntries }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "500" }}>You're all set for today.</Text>
      {day.intention && <Text style={{ color: "#666" }}>Intention: {day.intention.text}</Text>}
      {day.roses.map((r) => (
        <Text key={r.id}>🌹 {r.text}</Text>
      ))}
      {day.thorns.map((t) => (
        <Text key={t.id}>🥀 {t.text}</Text>
      ))}
    </View>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>{text}</Text>
    </View>
  );
}
