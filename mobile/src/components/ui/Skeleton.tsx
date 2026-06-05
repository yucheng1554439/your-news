import { useEffect, useRef } from "react";
import { Animated, StyleProp, View, ViewStyle } from "react-native";
import { colors, radii, spacing } from "@/theme";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
};

export function Skeleton({
  width = "100%",
  height = 16,
  style,
  borderRadius = radii.sm,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceRaised,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function StoryCardSkeleton({ featured = false }: { featured?: boolean }) {
  const imageHeight = featured ? 220 : 168;
  return (
    <View
      style={{
        borderRadius: radii.md,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Skeleton height={imageHeight} borderRadius={0} />
      <View style={{ padding: 14, gap: 10 }}>
        <Skeleton width="40%" height={12} />
        <Skeleton height={18} />
        <Skeleton height={18} width="85%" />
        <Skeleton height={14} />
        <Skeleton height={14} width="70%" />
      </View>
    </View>
  );
}

export function HomeFeedSkeleton() {
  return (
    <View style={{ padding: spacing.md, gap: spacing.lg }}>
      <View style={{ gap: 8 }}>
        <Skeleton width={160} height={28} />
        <Skeleton width={240} height={14} />
      </View>
      <StoryCardSkeleton featured />
      <View style={{ gap: 12 }}>
        <Skeleton width={180} height={22} />
        <StoryCardSkeleton />
        <StoryCardSkeleton />
      </View>
    </View>
  );
}

export function BriefingSkeleton() {
  return (
    <View style={{ padding: spacing.md, gap: spacing.lg }}>
      <Skeleton height={40} />
      <Skeleton height={40} />
      <Skeleton height={28} width="90%" />
      <Skeleton height={80} />
      <Skeleton height={100} />
      <Skeleton height={100} />
    </View>
  );
}

export function SavedSkeleton() {
  return (
    <View style={{ padding: spacing.md, gap: spacing.lg }}>
      <Skeleton width={180} height={28} />
      <Skeleton width={260} height={14} />
      <StoryCardSkeleton />
      <StoryCardSkeleton />
    </View>
  );
}

export function SignalDetailSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.md, gap: spacing.lg }}>
      <Skeleton width={80} height={48} />
      <Skeleton height={32} width="70%" />
      <Skeleton height={60} />
      <Skeleton height={100} />
      <Skeleton height={80} />
      <Skeleton height={80} />
    </View>
  );
}

export function StoryDetailSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Skeleton height={400} borderRadius={0} />
      <View style={{ padding: 20, gap: 16 }}>
        <Skeleton width="30%" height={12} />
        <Skeleton height={32} />
        <Skeleton height={32} width="90%" />
        <Skeleton height={14} width="50%" />
        <Skeleton height={120} />
        <Skeleton height={100} />
      </View>
    </View>
  );
}
