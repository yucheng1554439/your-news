import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StarRelevance } from "@/components/intelligence/StarRelevance";
import { colors, radii, spacing, typography } from "@/theme";
import type { SignalApiItem } from "@/types/intelligence";

export function SignalCard({ signal }: { signal: SignalApiItem }) {
  const router = useRouter();
  const icon = signal.direction === "rising" ? "↑" : "↓";
  const accent =
    signal.direction === "rising" ? colors.success : "#fbbf24";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(app)/signal/[id]",
          params: { id: signal.id },
        })
      }
      style={({ pressed }) => ({
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        padding: spacing.md,
        gap: spacing.sm,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <Text style={{ color: accent, fontSize: 20, fontWeight: "700" }}>
          {icon}
        </Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ ...typography.headline, color: colors.text }}>
            {signal.label}
          </Text>
          <Text style={{ ...typography.caption, color: colors.textMuted }}>
            {signal.sourceCount} sources · {signal.storyCount} stories
          </Text>
        </View>
      </View>

      <Text
        style={{
          ...typography.caption,
          color: colors.textSecondary,
          lineHeight: 20,
        }}
      >
        {signal.explanation}
      </Text>

      <StarRelevance
        stars={signal.relevance.stars}
        label={signal.relevance.label}
      />
    </Pressable>
  );
}
