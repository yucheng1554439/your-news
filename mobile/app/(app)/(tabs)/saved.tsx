import { useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StoryCard } from "@/components/story/StoryCard";
import { SavedSkeleton } from "@/components/ui/Skeleton";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { useTabPressRefresh } from "@/hooks/useTabPressRefresh";
import { formatSavedDate } from "@/lib/saved-snapshot";
import { resolveSavedStoryItems } from "@/lib/story-utils";
import { useSavedStories } from "@/providers/SavedStoriesProvider";
import { colors, radii, spacing, typography } from "@/theme";

export default function SavedScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, refresh, isInitialLoading } = useSavedStories();
  const { refreshing, onRefresh } = usePullRefresh(() => refresh());

  useTabPressRefresh(scrollRef, () => {
    void refresh();
  });

  const savedStories = useMemo(() => {
    if (!items) return [];
    return resolveSavedStoryItems(items);
  }, [items]);

  if (isInitialLoading) {
    return <SavedSkeleton />;
  }

  const isEmpty = items !== undefined && items.length === 0;
  const count = items?.length ?? 0;

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
        flexGrow: isEmpty ? 1 : undefined,
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
      {isEmpty ? (
        <SavedEmptyLibrary onBrowse={() => router.push("/(app)/(tabs)")} />
      ) : (
        <>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.eyebrow, color: colors.textMuted }}>
              Library
            </Text>
            <Text
              style={{ ...typography.hero, fontSize: 28, color: colors.text }}
              maxFontSizeMultiplier={1.15}
            >
              Saved Stories
            </Text>
            <Text style={{ ...typography.caption, color: colors.textMuted }}>
              {count} saved {count === 1 ? "story" : "stories"}
            </Text>
          </View>

          <View style={{ gap: spacing.md }}>
            {items!.map((snapshot) => {
              const story = savedStories.find((s) => s.slug === snapshot.slug);
              if (!story) return null;
              return (
                <StoryCard
                  key={snapshot.slug}
                  story={story}
                  variant="small"
                  savedAt={snapshot.savedAt}
                />
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function SavedEmptyLibrary({ onBrowse }: { onBrowse: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        paddingVertical: spacing.xl,
        gap: spacing.lg,
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.eyebrow, color: colors.textMuted }}>
          Library
        </Text>
        <Text
          style={{ ...typography.hero, fontSize: 28, color: colors.text }}
          maxFontSizeMultiplier={1.15}
        >
          Saved Stories
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            fontSize: 16,
            lineHeight: 24,
          }}
          maxFontSizeMultiplier={1.25}
        >
          Your library is empty.
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.textMuted,
            fontSize: 15,
            lineHeight: 22,
          }}
          maxFontSizeMultiplier={1.25}
        >
          Save stories from Home, Briefings, Signals, or Story Detail pages to
          build your intelligence desk.
        </Text>
      </View>

      <Pressable
        onPress={onBrowse}
        style={({ pressed }) => ({
          alignSelf: "flex-start",
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
          paddingHorizontal: 20,
          paddingVertical: 12,
        })}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
            letterSpacing: 0.3,
          }}
        >
          Browse Stories
        </Text>
      </Pressable>
    </View>
  );
}
