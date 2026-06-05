import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";
import { formatWatchItems, splitTextIntoChunks } from "@/lib/text-chunks";
import type { BriefingDisplaySection } from "@/lib/briefing-display";
import { colors, radii, spacing, typography } from "@/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MIN_CARD_HEIGHT = SCREEN_HEIGHT * 0.45;

type BriefingSectionPagerProps = {
  sections: BriefingDisplaySection[];
  resetKey: string;
};

export function BriefingSectionPager({
  sections,
  resetKey,
}: BriefingSectionPagerProps) {
  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);
  const [heights, setHeights] = useState<number[]>([]);

  const activeHeight = Math.max(
    MIN_CARD_HEIGHT,
    heights[page] ?? MIN_CARD_HEIGHT
  );

  useEffect(() => {
    setPage(0);
    setHeights([]);
    pagerRef.current?.setPage(0);
  }, [resetKey]);

  const onPageSelected = (e: PagerViewOnPageSelectedEvent) => {
    setPage(e.nativeEvent.position);
  };

  const onTabPress = (index: number) => {
    pagerRef.current?.setPage(index);
  };

  const reportHeight = (index: number, height: number) => {
    setHeights((prev) => {
      const measured = Math.ceil(height);
      if (prev[index] === measured) return prev;
      const next = [...prev];
      next[index] = measured;
      return next;
    });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: "rgba(255,255,255,0.04)",
          padding: 3,
        }}
      >
          {sections.map((section, index) => {
            const active = index === page;
            return (
              <Pressable
                key={section.key}
                onPress={() => onTabPress(index)}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: radii.pill,
                  backgroundColor: active
                    ? "rgba(255,255,255,0.14)"
                    : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: active ? "700" : "500",
                    color: active ? colors.text : colors.textSectionLabel,
                  }}
                  maxFontSizeMultiplier={1.1}
                >
                  {section.shortLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

      <PagerView
        ref={pagerRef}
        style={{ height: activeHeight }}
        initialPage={0}
        onPageSelected={onPageSelected}
        overdrag
      >
        {sections.map((section, index) => (
          <View key={section.key} collapsable={false}>
            <BriefingPageCard
              section={section}
              onLayout={(height) => reportHeight(index, height)}
            />
          </View>
        ))}
      </PagerView>
    </View>
  );
}

function BriefingPageCard({
  section,
  onLayout,
}: {
  section: BriefingDisplaySection;
  onLayout: (height: number) => void;
}) {
  const isWatch = section.label === "Watch";
  const watchBullets =
    isWatch && section.body.includes("\n")
      ? formatWatchItems(section.body.split(/\n+/))
      : null;
  const chunks = watchBullets ?? splitTextIntoChunks(section.body, 3);

  const handleLayout = (e: LayoutChangeEvent) => {
    onLayout(e.nativeEvent.layout.height);
  };

  return (
    <View
      onLayout={handleLayout}
      style={{
        minHeight: MIN_CARD_HEIGHT,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: section.highlight ? colors.borderStrong : colors.border,
        backgroundColor: section.highlight
          ? colors.surfaceRaised
          : colors.surface,
        padding: spacing.lg,
        gap: spacing.md,
        marginRight: spacing.xs,
      }}
    >
      <Text style={{ ...typography.eyebrow, color: colors.textSectionLabel }}>
        {section.label}
      </Text>

      <View style={{ gap: spacing.md }}>
        {watchBullets
          ? watchBullets.map((item, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                <Text style={{ color: colors.textBody, fontSize: 15 }}>•</Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    lineHeight: 26,
                    color: colors.textBody,
                  }}
                  maxFontSizeMultiplier={1.3}
                  android_hyphenationFrequency="none"
                >
                  {item}
                </Text>
              </View>
            ))
          : chunks.map((chunk, i) => (
              <Text
                key={i}
                style={{
                  fontSize: 16,
                  lineHeight: 26,
                  color: colors.textBody,
                }}
                maxFontSizeMultiplier={1.3}
                android_hyphenationFrequency="none"
              >
                {chunk}
              </Text>
            ))}
      </View>
    </View>
  );
}
