import { useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { SaveStoryButtonOverlay } from "@/components/story/SaveStoryButton";
import { StoryImage } from "@/components/ui/StoryImage";
import { TagRow } from "@/components/ui/TagRow";
import { getCategoryLabel } from "@/lib/categories";
import {
  formatStoryDate,
  getDisplayTags,
  isCriticalStory,
} from "@/lib/story-utils";
import { formatSavedDate } from "@/lib/saved-snapshot";
import { colors, radii, spacing, typography } from "@/theme";
import { CARD_LAYOUT } from "@/theme/cards";
import type { Story } from "@/types";

export type StoryCardVariant = "large" | "medium" | "small";

type StoryCardProps = {
  story: Story;
  variant?: StoryCardVariant | "default" | "featured" | "compact";
  personalized?: boolean;
  savedAt?: number;
};

function resolveVariant(
  v: StoryCardProps["variant"]
): StoryCardVariant {
  if (v === "featured" || v === "large") return "large";
  if (v === "compact" || v === "small") return "small";
  if (v === "medium") return "medium";
  return "medium";
}

export const StoryCard = memo(function StoryCard({
  story,
  variant: variantIn = "medium",
  personalized = false,
  savedAt,
}: StoryCardProps) {
  const router = useRouter();
  const variant = resolveVariant(variantIn);
  const layout = CARD_LAYOUT[variant];
  const showCritical = isCriticalStory(story, personalized);
  const displayTags = getDisplayTags(story, variant === "small" ? 2 : 3);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(app)/story/[slug]",
          params: { slug: story.slug },
        })
      }
      style={({ pressed }) => ({
        borderRadius: radii.lg,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: variant === "large" ? colors.borderStrong : colors.border,
        minHeight: layout.minHeight,
        opacity: pressed ? 0.94 : 1,
      })}
    >
      <View style={{ height: layout.imageHeight, width: "100%" }}>
        <StoryImage
          uri={story.imageUrl}
          style={{ width: "100%", height: "100%" }}
          priority={variant === "large" ? "high" : "normal"}
        />
        {variant !== "small" ? (
          <SaveStoryButtonOverlay
            story={story}
            size={variant === "large" ? "md" : "sm"}
          />
        ) : null}
      </View>

      <View style={{ padding: spacing.md, gap: spacing.sm, flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text
            style={{ ...typography.caption, color: colors.textMuted }}
            maxFontSizeMultiplier={1.25}
          >
            {getCategoryLabel(story.category)}
          </Text>
          <Text style={{ color: colors.textDim }}>·</Text>
          <Text
            style={{ ...typography.caption, color: colors.textMuted }}
            maxFontSizeMultiplier={1.25}
          >
            {formatStoryDate(story.publishedAt)}
          </Text>
          {showCritical ? (
            <>
              <Text style={{ color: colors.textDim }}>·</Text>
              <Text
                style={{
                  ...typography.caption,
                  color: colors.text,
                  fontWeight: "700",
                }}
              >
                Critical
              </Text>
            </>
          ) : null}
          {savedAt ? (
            <>
              <Text style={{ color: colors.textDim }}>·</Text>
              <Text
                style={{ ...typography.caption, color: colors.textMuted }}
                maxFontSizeMultiplier={1.25}
              >
                {formatSavedDate(savedAt)}
              </Text>
            </>
          ) : null}
        </View>

        <Text
          style={{
            fontSize: variant === "large" ? 22 : 17,
            lineHeight: variant === "large" ? 28 : 22,
            fontWeight: "600",
            color: colors.text,
          }}
          numberOfLines={layout.headlineLines}
          maxFontSizeMultiplier={1.3}
        >
          {story.headline}
        </Text>

        {variant !== "small" ? (
          <Text
            style={{
              ...typography.caption,
              color: colors.textSecondary,
              lineHeight: 20,
            }}
            numberOfLines={layout.summaryLines}
            maxFontSizeMultiplier={1.25}
          >
            {story.summary}
          </Text>
        ) : null}

        <TagRow tags={displayTags} />
      </View>
    </Pressable>
  );
});
