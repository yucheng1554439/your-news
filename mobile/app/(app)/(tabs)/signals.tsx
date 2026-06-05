import { useRef } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedSection, EmptyState } from "@/components/feed/FeedSection";
import { SignalCard } from "@/components/signals/SignalCard";
import { HomeFeedSkeleton } from "@/components/ui/Skeleton";
import { FeedErrorBanner } from "@/components/ui/primitives";
import { useSignals } from "@/hooks/useSignals";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { useTabPressRefresh } from "@/hooks/useTabPressRefresh";
import { colors, spacing, typography } from "@/theme";

export default function SignalsScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, error, refetch } = useSignals();
  const { refreshing, onRefresh } = usePullRefresh(() => refetch());

  useTabPressRefresh(scrollRef, () => {
    void refetch();
  });

  if (isPending && !data) return <HomeFeedSkeleton />;

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
        <FeedErrorBanner message={error?.message ?? "Could not load signals."} />
      </View>
    );
  }

  const empty = data.rising.length === 0 && data.falling.length === 0;

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
      <View style={{ gap: 6 }}>
        <Text
          style={{ ...typography.hero, fontSize: 30, color: colors.text }}
          maxFontSizeMultiplier={1.2}
        >
          Signals
        </Text>
        <Text
          style={{ ...typography.caption, color: colors.textMuted }}
          maxFontSizeMultiplier={1.2}
        >
          {data.lensLabel}
        </Text>
      </View>

      {empty ? (
        <EmptyState
          title="No momentum shifts yet"
          message="Pull to refresh or double-tap the Signals tab after the next intelligence update."
        />
      ) : (
        <>
          {data.rising.length > 0 ? (
            <FeedSection title="Signals Rising" eyebrow="Momentum">
              <View style={{ gap: spacing.md }}>
                {data.rising.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </View>
            </FeedSection>
          ) : null}

          {data.falling.length > 0 ? (
            <FeedSection title="Signals Falling" eyebrow="Cooling">
              <View style={{ gap: spacing.md }}>
                {data.falling.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </View>
            </FeedSection>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
