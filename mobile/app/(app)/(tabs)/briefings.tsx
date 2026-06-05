import { useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BriefingView } from "@/components/briefing/BriefingView";
import { IntelligenceRefreshControl } from "@/components/intelligence/IntelligenceRefreshControl";
import { EmptyState } from "@/components/feed/FeedSection";
import { BriefingSkeleton } from "@/components/ui/Skeleton";
import { FeedErrorBanner } from "@/components/ui/primitives";
import { PremiumSegmentedControl } from "@/components/ui/PremiumSegmentedControl";
import { useDashboard } from "@/hooks/useDashboard";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { useTabPressRefresh } from "@/hooks/useTabPressRefresh";
import { selectBriefing } from "@/lib/briefing-display";
import { colors, spacing, typography } from "@/theme";
import type { BriefingMode } from "@/types";

export default function BriefingsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, error, refetch } = useDashboard();
  const [mode, setMode] = useState<BriefingMode>("for-you");
  const { refreshing, onRefresh } = usePullRefresh(() => refetch());

  useTabPressRefresh(scrollRef, () => {
    void refetch();
  });

  const briefing = useMemo(() => {
    if (!data) return null;
    return selectBriefing(data.briefings, mode);
  }, [data, mode]);

  const personalization = useMemo(
    () =>
      data
        ? { profile: data.profile, userIntelligence: data.userIntelligence }
        : undefined,
    [data?.profile, data?.userIntelligence]
  );

  if (isPending && !data) return <BriefingSkeleton />;

  if (isError || !data) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          padding: spacing.lg,
          paddingTop: insets.top,
        }}
      >
        <FeedErrorBanner
          message={error?.message ?? "Could not load briefings."}
        />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
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
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: spacing.xs }}>
        <Text
          style={{ ...typography.hero, fontSize: 30, color: colors.text }}
          maxFontSizeMultiplier={1.15}
        >
          Intelligence
        </Text>
        <Text style={{ ...typography.caption, color: colors.textMuted }}>
          Strategic intelligence — For You and Global perspectives.
        </Text>
      </View>

      <IntelligenceRefreshControl
        lastUpdated={data.meta.intelligenceUpdatedAt}
        storiesFetchedAt={data.meta.fetchedAt}
        persistenceConfigured={data.meta.persistenceConfigured}
      />

      <PremiumSegmentedControl
        options={[
          { value: "for-you" as const, label: "For You" },
          { value: "global" as const, label: "Global" },
        ]}
        value={mode}
        onChange={setMode}
      />

      {briefing ? (
        <BriefingView
          briefing={briefing}
          intelligenceUpdatedAt={data.meta.intelligenceUpdatedAt}
          personalization={personalization}
        />
      ) : (
        <EmptyState
          title="Briefing unavailable"
          message={`No ${mode === "for-you" ? "For You" : "Global"} intelligence in the current snapshot. Pull to refresh or tap Refresh Intelligence.`}
        />
      )}
    </ScrollView>
  );
}
