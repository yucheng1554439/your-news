import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StarRelevance } from "@/components/intelligence/StarRelevance";
import { SignalDetailSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feed/FeedSection";
import { useSignals } from "@/hooks/useSignals";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { colors, radii, spacing, typography } from "@/theme";

export default function SignalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, refetch } = useSignals();
  const { refreshing, onRefresh } = usePullRefresh(() => refetch());

  const signal = useMemo(() => {
    if (!data || !id) return undefined;
    return (
      data.rising.find((s) => s.id === id) ??
      data.falling.find((s) => s.id === id)
    );
  }, [data, id]);

  if (isPending && !data) return <SignalDetailSkeleton />;

  if (!signal) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <EmptyState
          title="Signal not found"
          message="Return to the Signals tab and pull to refresh."
        />
      </View>
    );
  }

  const icon = signal.direction === "rising" ? "↑" : signal.direction === "falling" ? "↓" : "→";
  const accent =
    signal.direction === "rising"
      ? colors.success
      : signal.direction === "falling"
        ? "#fbbf24"
        : colors.textMuted;
  const trendLabel =
    signal.direction === "rising"
      ? "Trending up"
      : signal.direction === "falling"
        ? "Trending down"
        : "Stable";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#fff"
        />
      }
    >
      <View
        style={{
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radii.md,
              backgroundColor: "rgba(255,255,255,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: accent, fontSize: 28, fontWeight: "700" }}>
              {icon}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ ...typography.hero, fontSize: 26, color: colors.text }}>
              {signal.label}
            </Text>
            <Text style={{ color: accent, fontSize: 13, fontWeight: "600" }}>
              {trendLabel}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatPill label="Sources" value={String(signal.sourceCount)} />
          <StatPill label="Stories" value={String(signal.storyCount)} />
          <StatPill label="Momentum" value={trendLabel} />
        </View>

        <StarRelevance
          stars={signal.relevance.stars}
          label={signal.relevance.label}
        />
      </View>

      <DetailBlock title="Recent Trend" body={signal.explanation} />
      <DetailBlock title="Why It Matters" body={signal.whyItMatters} highlight />

      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.title, color: colors.text }}>
          Related Stories
        </Text>
        <Text style={{ ...typography.caption, color: colors.textMuted }}>
          Coverage tied to this signal in your current feed — same theme and
          entities, not unrelated headlines.
        </Text>
        {signal.relatedStories.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>
            No tightly matched stories in this snapshot.
          </Text>
        ) : (
          signal.relatedStories.map((story) => (
            <Pressable
              key={story.slug}
              onPress={() =>
                router.push({
                  pathname: "/(app)/story/[slug]",
                  params: { slug: story.slug },
                })
              }
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: spacing.md,
                gap: 4,
              }}
            >
              <Text
                style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
                numberOfLines={3}
              >
                {story.headline}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {story.source}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        minHeight: 32,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
        {value}
      </Text>
    </View>
  );
}

function DetailBlock({
  title,
  body,
  highlight,
}: {
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: highlight ? colors.borderStrong : colors.border,
        backgroundColor: highlight ? colors.surfaceRaised : colors.surface,
        padding: spacing.lg,
        gap: 8,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: colors.textMuted,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
      <Text style={{ ...typography.body, color: "#d4d4d8", fontSize: 15 }}>
        {body}
      </Text>
    </View>
  );
}
