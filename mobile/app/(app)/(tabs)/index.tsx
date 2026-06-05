import { useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IntelligenceRefreshControl } from "@/components/intelligence/IntelligenceRefreshControl";
import { CategoryFilterBar } from "@/components/ui/CategoryFilterBar";
import { FeedSection } from "@/components/feed/FeedSection";
import { StoryCard } from "@/components/story/StoryCard";
import { HomeFeedSkeleton } from "@/components/ui/Skeleton";
import { FeedErrorBanner } from "@/components/ui/primitives";
import { useDashboard } from "@/hooks/useDashboard";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { useTabPressRefresh } from "@/hooks/useTabPressRefresh";
import {
  filterStoriesByCategory,
  type TopStoryCategory,
} from "@/lib/category-filter";
import { resolveStoriesBySlugs, storyBySlug } from "@/lib/story-utils";
import { colors, spacing, typography } from "@/theme";

const MORE_PAGE = 12;

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, error, refetch } = useDashboard();
  const [topCategory, setTopCategory] = useState<TopStoryCategory>("all");
  const [moreVisible, setMoreVisible] = useState(MORE_PAGE);
  const { refreshing, onRefresh } = usePullRefresh(() => refetch());

  useTabPressRefresh(scrollRef, () => {
    void refetch();
  });

  const sections = useMemo(() => {
    if (!data) return null;
    const pool = data.stories;
    return {
      lead: data.sections.leadSlug
        ? storyBySlug(pool, data.sections.leadSlug)
        : undefined,
      relevant: resolveStoriesBySlugs(pool, data.sections.relevantSlugs),
      top: resolveStoriesBySlugs(pool, data.sections.topSlugs),
      more: resolveStoriesBySlugs(pool, data.sections.moreStoriesSlugs),
    };
  }, [data]);

  const filteredTop = useMemo(() => {
    if (!sections) return [];
    return filterStoriesByCategory(sections.top, topCategory);
  }, [sections, topCategory]);

  const moreSlice = useMemo(() => {
    if (!sections) return [];
    return sections.more.slice(0, moreVisible);
  }, [sections, moreVisible]);

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
        <FeedErrorBanner
          message={error?.message ?? "Could not load your intelligence feed."}
        />
      </View>
    );
  }

  if (data.stories.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top }}
      >
        <FeedErrorBanner
          message={
            data.meta.feedError ??
            "No stories available yet. Check back after the next refresh."
          }
        />
      </ScrollView>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - 400
    ) {
      setMoreVisible((n) => Math.min((sections?.more.length ?? 0), n + MORE_PAGE));
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
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
      onScroll={onScroll}
      scrollEventThrottle={200}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ gap: 4 }}>
          <Text
            style={{ ...typography.hero, fontSize: 32, color: colors.text }}
            maxFontSizeMultiplier={1.2}
          >
            Your News
          </Text>
          <Text
            style={{ ...typography.caption, color: colors.textMuted }}
            maxFontSizeMultiplier={1.2}
          >
            Strategic intelligence, personalized for you.
          </Text>
        </View>
        <IntelligenceRefreshControl
          lastUpdated={data.meta.intelligenceUpdatedAt}
          storiesFetchedAt={data.meta.fetchedAt}
          persistenceConfigured={data.meta.persistenceConfigured}
        />
      </View>

      {data.meta.feedError ? (
        <FeedErrorBanner message={data.meta.feedError} />
      ) : null}

      {sections?.lead ? (
        <FeedSection variant="lead" title="Lead Story">
          <StoryCard story={sections.lead} variant="large" personalized />
        </FeedSection>
      ) : null}

      {sections && sections.relevant.length > 0 ? (
        <FeedSection
          title="Relevant to You"
          subtitle="Coverage aligned with your intelligence lens"
          eyebrow="Personalized"
        >
          <View style={{ gap: spacing.md }}>
            {sections.relevant.map((story) => (
              <StoryCard
                key={story.slug}
                story={story}
                variant="medium"
                personalized
              />
            ))}
          </View>
        </FeedSection>
      ) : null}

      {sections && sections.top.length > 0 ? (
        <FeedSection
          title="Top Stories"
          subtitle="Highest editorial weight across domains"
          eyebrow="Editorial"
        >
          <CategoryFilterBar value={topCategory} onChange={setTopCategory} />
          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            {filteredTop.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>
                No stories in this category right now.
              </Text>
            ) : (
              filteredTop.map((story) => (
                <StoryCard
                  key={story.slug}
                  story={story}
                  variant="medium"
                  personalized
                />
              ))
            )}
          </View>
        </FeedSection>
      ) : null}

      {sections && sections.more.length > 0 ? (
        <FeedSection
          title="More Stories"
          subtitle="Further coverage across strategic themes"
          eyebrow="Discover"
        >
          <View style={{ gap: spacing.md }}>
            {moreSlice.map((story) => (
              <StoryCard key={story.slug} story={story} variant="small" />
            ))}
          </View>
        </FeedSection>
      ) : null}
    </ScrollView>
  );
}
