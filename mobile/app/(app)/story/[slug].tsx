import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useMemo } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IntelligenceSectionCard } from "@/components/intelligence/IntelligenceSectionCard";
import { SaveStoryButtonOverlay } from "@/components/story/SaveStoryButton";
import { StoryCard } from "@/components/story/StoryCard";
import { StoryImage } from "@/components/ui/StoryImage";
import { StoryDetailSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feed/FeedSection";
import { useDashboard } from "@/hooks/useDashboard";
import { getCategoryLabel } from "@/lib/categories";
import { snapshotToStory } from "@/lib/saved-snapshot";
import { resolveStoryIntelligence } from "@/lib/story-intelligence";
import { allStoryPool, formatStoryDate, storyBySlug } from "@/lib/story-utils";
import { useSavedStories } from "@/providers/SavedStoriesProvider";
import { colors, radii, spacing, typography } from "@/theme";
import type { Story } from "@/types";

const HERO_HEIGHT = Math.min(420, Dimensions.get("window").height * 0.48);
const HEADLINE_SIZE = Dimensions.get("window").width < 390 ? 34 : 40;

export default function StoryDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { data, isPending } = useDashboard();
  const { getSnapshot, isInitialLoading: savedLoading } = useSavedStories();

  const savedSnapshot = slug ? getSnapshot(slug) : undefined;

  const story = useMemo(() => {
    if (savedSnapshot) {
      return snapshotToStory(savedSnapshot);
    }
    if (!data || !slug) return undefined;
    return (
      storyBySlug(data.stories, slug) ??
      storyBySlug(data.globalStories, slug)
    );
  }, [savedSnapshot, data, slug]);

  const intelligence = useMemo(
    () => (story ? resolveStoryIntelligence(story) : null),
    [story]
  );

  const related = useMemo(() => {
    if (!story || !data || savedSnapshot) return [] as Story[];
    const pool = allStoryPool(data).filter((s) => s.slug !== story.slug);
    const cluster = story.narrativeClusterId;
    const corroborating = new Set(story.corroboratingSlugs ?? []);

    const scored = pool
      .map((s) => {
        let score = 0;
        if (cluster && s.narrativeClusterId === cluster) score += 5;
        if (corroborating.has(s.slug)) score += 4;
        if (s.category === story.category) score += 2;
        const sharedTags = (s.strategicTags ?? []).filter((t) =>
          (story.strategicTags ?? []).includes(t)
        );
        score += sharedTags.length;
        return { s, score };
      })
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.s);

    return scored;
  }, [story, data, savedSnapshot]);

  const waitingForData =
    !savedSnapshot && isPending && !data && savedLoading;

  if (waitingForData) return <StoryDetailSkeleton />;

  if (!story || !intelligence) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg }}>
        <EmptyState
          title="Story unavailable"
          message="This story could not be loaded. If you saved it, try opening from Saved — or pull to refresh on Home."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ height: HERO_HEIGHT, width: "100%" }}>
        <StoryImage
          uri={story.imageUrl}
          style={{ width: "100%", height: "100%" }}
          priority="high"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.75)"]}
          locations={[0, 0.45, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <SaveStoryButtonOverlay story={story} size="lg" hero />
        <View
          style={{
            position: "absolute",
            left: spacing.md,
            right: spacing.md,
            bottom: spacing.md,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <MetaPill label={getCategoryLabel(story.category)} />
            <MetaPill label={formatStoryDate(story.publishedAt)} />
            {savedSnapshot ? (
              <MetaPill label="Saved library" />
            ) : null}
          </View>
          <Text
            style={{
              fontSize: HEADLINE_SIZE,
              lineHeight: HEADLINE_SIZE * 1.15,
              fontWeight: "700",
              color: colors.text,
            }}
            numberOfLines={5}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            maxFontSizeMultiplier={1.25}
          >
            {story.headline}
          </Text>
          <Text
            style={{ ...typography.caption, color: colors.textSecondary }}
            maxFontSizeMultiplier={1.2}
          >
            {story.source}
          </Text>
        </View>
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <IntelligenceSectionCard
          variant="lead"
          label={intelligence.briefing.title}
          body={intelligence.briefing.body}
          disclaimer={intelligence.briefing.disclaimer}
          isFallback={intelligence.briefing.isFallback}
        />

        <IntelligenceSectionCard
          label={intelligence.whyItMatters.title}
          body={intelligence.whyItMatters.body}
          isFallback={intelligence.whyItMatters.isFallback}
        />

        <IntelligenceSectionCard
          label={intelligence.whyItMattersToYou.title}
          body={intelligence.whyItMattersToYou.body}
          highlight
          isFallback={intelligence.whyItMattersToYou.isFallback}
        />

        <IntelligenceSectionCard
          label={intelligence.whatToWatch.title}
          body={intelligence.whatToWatch.body}
          isFallback={intelligence.whatToWatch.isFallback}
        />

        {story.sourceUrl ? (
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(story.sourceUrl!)}
            style={({ pressed }) => ({
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
              padding: spacing.lg,
              gap: 6,
            })}
          >
            <Text style={{ ...typography.eyebrow, color: colors.textMuted }}>
              Original Article
            </Text>
            <Text style={{ ...typography.headline, color: colors.text }}>
              Read Original Article →
            </Text>
            <Text style={{ ...typography.caption, color: colors.textMuted }}>
              {story.source}
            </Text>
          </Pressable>
        ) : null}

        {related.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={{ ...typography.title, color: colors.text }}>
              Related Coverage
            </Text>
            {related.map((s) => (
              <StoryCard key={s.slug} story={s} variant="small" />
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View
      style={{
        borderRadius: radii.pill,
        backgroundColor: "rgba(9,9,11,0.55)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        minHeight: 32,
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label}</Text>
    </View>
  );
}
