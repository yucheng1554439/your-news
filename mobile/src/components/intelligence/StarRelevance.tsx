import { Text, View } from "react-native";
import { colors } from "@/theme";

export function StarRelevance({
  stars,
  label,
}: {
  stars: number;
  label: string;
}) {
  const filled = "★".repeat(Math.max(1, Math.min(5, stars)));
  const empty = "☆".repeat(5 - Math.max(1, Math.min(5, stars)));

  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: colors.accent, fontSize: 14, letterSpacing: 1 }}>
        {filled}
        <Text style={{ color: colors.textDim }}>{empty}</Text>
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
