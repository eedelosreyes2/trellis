import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSession } from "../../lib/session";
import { getActiveGoals, createGoal, setGoalStatus } from "../../lib/db";
import type { Goal } from "../../lib/types";

export default function GoalsScreen() {
  const session = useSession();
  if (session.status !== "ready") return null; // Today tab already handles loading/error UI
  return <GoalsContent userId={session.userId} />;
}

function GoalsContent({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(""); // free-text "YYYY-MM-DD" for this v1

  const refresh = useCallback(async () => {
    setGoals(await getActiveGoals(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addGoal() {
    if (!title.trim()) return;
    await createGoal({ userId, title: title.trim(), deadline: deadline.trim() || null });
    setTitle("");
    setDeadline("");
    refresh();
  }

  async function completeGoal(goalId: string) {
    await setGoalStatus(goalId, "completed");
    refresh();
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "500" }}>Goals</Text>

      {goals.map((g) => (
        <View
          key={g.id}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 12,
            backgroundColor: "#f2f2f2",
            borderRadius: 8,
          }}
        >
          <View>
            <Text>{g.title}</Text>
            {g.deadline && <Text style={{ fontSize: 12, color: "#666" }}>Due {g.deadline}</Text>}
          </View>
          <Pressable onPress={() => completeGoal(g.id)}>
            <Text style={{ color: "#1D9E75" }}>Done</Text>
          </Pressable>
        </View>
      ))}

      <View style={{ gap: 8, marginTop: 12 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="New goal"
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }}
        />
        <TextInput
          value={deadline}
          onChangeText={setDeadline}
          placeholder="Deadline (YYYY-MM-DD, optional)"
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }}
        />
        <Pressable onPress={addGoal} style={{ backgroundColor: "#534AB7", padding: 14, borderRadius: 8 }}>
          <Text style={{ color: "#fff", textAlign: "center" }}>Add goal</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
