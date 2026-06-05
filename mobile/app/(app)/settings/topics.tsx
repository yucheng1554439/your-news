import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  fetchTopicPreferences,
  saveTopicPreferences,
  type TopicPreferences,
} from "@/api/endpoints";
import { colors, radii, spacing, typography } from "@/theme";

const TOPIC_OPTIONS = [
  { id: "ai", label: "AI & Technology" },
  { id: "markets", label: "Markets" },
  { id: "energy", label: "Energy" },
  { id: "geopolitics", label: "Geopolitics" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "startups", label: "Startups" },
  { id: "policy", label: "Policy" },
  { id: "developer", label: "Developer" },
  { id: "technology", label: "Technology" },
  { id: "science", label: "Science" },
  { id: "sports", label: "Sports" },
  { id: "entertainment", label: "Entertainment" },
] as const;

const BUCKETS: {
  key: keyof TopicPreferences;
  title: string;
  description: string;
}[] = [
  {
    key: "moreOf",
    title: "Topics I Want More Of",
    description: "Stories in these areas will rank higher in your feed and briefings.",
  },
  {
    key: "lessOf",
    title: "Topics I Want Less Of",
    description: "You'll still see these occasionally, but they'll be deprioritized.",
  },
  {
    key: "neverShow",
    title: "Never Show Me",
    description: "Stories in these topics are filtered out of your personalized feed.",
  },
];

export default function TopicPreferencesScreen() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<TopicPreferences | null>(null);

  const query = useQuery({
    queryKey: ["topicPreferences"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetchTopicPreferences(token);
      setLocal(res.topicPreferences);
      return res.topicPreferences;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (prefs: TopicPreferences) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return saveTopicPreferences(token, prefs);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topicPreferences"] });
      void queryClient.invalidateQueries({ queryKey: ["profileIntelligence"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const prefs = local ?? query.data;

  const toggle = (topicId: string, bucket: keyof TopicPreferences) => {
    if (!prefs) return;
    const next: TopicPreferences = {
      moreOf: prefs.moreOf.filter((id) => id !== topicId),
      lessOf: prefs.lessOf.filter((id) => id !== topicId),
      neverShow: prefs.neverShow.filter((id) => id !== topicId),
    };
    if (!prefs[bucket].includes(topicId)) {
      next[bucket] = [...next[bucket], topicId];
    }
    setLocal(next);
  };

  return (
    <>
      <Stack.Screen options={{ title: "Topic preferences" }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl }}
      >
        <View style={{ gap: 6 }}>
          <Text style={{ ...typography.title, color: colors.text }}>
            Personalize your feed
          </Text>
          <Text style={{ ...typography.caption, color: colors.textMuted, lineHeight: 20 }}>
            Tell us what to emphasize or filter. Changes apply to your For You
            feed and briefings on web and mobile.
          </Text>
        </View>

        {query.isLoading || !prefs ? (
          <ActivityIndicator color="#fff" />
        ) : (
          BUCKETS.map((bucket) => (
            <View
              key={bucket.key}
              style={{
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ ...typography.headline, color: colors.text }}>
                {bucket.title}
              </Text>
              <Text style={{ ...typography.caption, color: colors.textMuted, lineHeight: 20 }}>
                {bucket.description}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {TOPIC_OPTIONS.map((topic) => {
                  const active = prefs[bucket.key].includes(topic.id);
                  return (
                    <Pressable
                      key={`${bucket.key}-${topic.id}`}
                      onPress={() => toggle(topic.id, bucket.key)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: radii.pill,
                        backgroundColor: active ? colors.surfaceRaised : colors.bg,
                        borderWidth: 1,
                        borderColor: active ? colors.borderStrong : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? colors.text : colors.textSecondary,
                          fontSize: 13,
                          fontWeight: active ? "600" : "400",
                        }}
                      >
                        {topic.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {saveMutation.isError ? (
          <Text style={{ color: colors.danger }}>
            {saveMutation.error.message}
          </Text>
        ) : null}

        <Pressable
          disabled={!prefs || saveMutation.isPending}
          onPress={() => prefs && saveMutation.mutate(prefs)}
          style={{
            backgroundColor: colors.text,
            padding: 16,
            borderRadius: radii.pill,
            opacity: saveMutation.isPending || !prefs ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              color: colors.bg,
              textAlign: "center",
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            {saveMutation.isPending ? "Saving…" : "Save preferences"}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
