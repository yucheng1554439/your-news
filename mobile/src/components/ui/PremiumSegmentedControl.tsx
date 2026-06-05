import { useCallback, useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors, radii } from "@/theme";

const SPRING = { damping: 20, stiffness: 220 };

type PremiumSegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function PremiumSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: PremiumSegmentedControlProps<T>) {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const segmentWidth = layoutWidth / Math.max(options.length, 1);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const translateX = useSharedValue(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      setLayoutWidth(e.nativeEvent.layout.width);
    },
    []
  );

  useEffect(() => {
    if (segmentWidth > 0) {
      translateX.value = withSpring(activeIndex * segmentWidth, SPRING);
    }
  }, [activeIndex, segmentWidth, translateX]);

  const onSelect = (index: number, next: T) => {
    translateX.value = withSpring(index * segmentWidth, SPRING);
    onChange(next);
  };

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth - 6,
  }));

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: "row",
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: "rgba(255,255,255,0.06)",
        padding: 3,
        overflow: "hidden",
      }}
    >
      {layoutWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 3,
              left: 3,
              bottom: 3,
              borderRadius: radii.pill,
              backgroundColor: "rgba(255,255,255,0.14)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            },
            pillStyle,
          ]}
        />
      ) : null}

      {options.map((opt, index) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(index, opt.value)}
            style={{
              flex: 1,
              paddingVertical: 11,
              paddingHorizontal: 14,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "700" : "500",
                color: active ? colors.text : colors.textMuted,
                letterSpacing: active ? 0.2 : 0,
              }}
              maxFontSizeMultiplier={1.15}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
