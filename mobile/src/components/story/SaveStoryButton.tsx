import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hapticLight } from "@/lib/haptics";
import { useSavedStories } from "@/providers/SavedStoriesProvider";
import { colors, radii } from "@/theme";
import type { Story } from "@/types";

type SaveStoryButtonProps = {
  story: Story;
  size?: "sm" | "md" | "lg";
  floating?: boolean;
};

const SIZES = { sm: 36, md: 40, lg: 44 } as const;
const ICONS = { sm: 17, md: 19, lg: 22 } as const;

export const SaveStoryButton = memo(function SaveStoryButton({
  story,
  size = "md",
  floating = false,
}: SaveStoryButtonProps) {
  const { isSaved, toggle } = useSavedStories();
  const saved = isSaved(story.slug);
  const dim = SIZES[size];
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(saved ? 1.08 : 1, { damping: 14 });
  }, [saved, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: saved ? 1 : 0.92,
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => {
          void hapticLight();
          void toggle(story);
        }}
        hitSlop={10}
        style={[
          styles.glass,
          {
            width: dim,
            height: dim,
            borderRadius: radii.pill,
            backgroundColor: saved
              ? "rgba(251,191,36,0.28)"
              : "rgba(9,9,11,0.45)",
            borderColor: saved
              ? "rgba(251,191,36,0.5)"
              : "rgba(255,255,255,0.22)",
          },
          floating && styles.floating,
        ]}
        accessibilityRole="button"
        accessibilityLabel={saved ? "Remove from saved" : "Save story"}
      >
        <Ionicons
          name={saved ? "bookmark" : "bookmark-outline"}
          size={ICONS[size]}
          color={saved ? colors.accent : "#f4f4f5"}
        />
      </Pressable>
    </Animated.View>
  );
});

export const SaveStoryButtonOverlay = memo(function SaveStoryButtonOverlay({
  story,
  size = "md",
  hero = false,
}: SaveStoryButtonProps & { hero?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: "absolute",
        top: hero ? Math.max(insets.top, 12) : 10,
        right: 12,
        zIndex: 10,
      }}
      pointerEvents="box-none"
    >
      <SaveStoryButton story={story} size={size} floating />
    </View>
  );
});

const styles = StyleSheet.create({
  glass: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
