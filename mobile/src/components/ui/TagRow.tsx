import { memo } from "react";
import { ScrollView, Text, View } from "react-native";
import { colors, radii } from "@/theme";

type TagRowProps = {
  tags: string[];
  horizontal?: boolean;
};

export const TagRow = memo(function TagRow({
  tags,
  horizontal = false,
}: TagRowProps) {
  if (tags.length === 0) return null;

  const chip = (tag: string) => (
    <View
      key={tag}
      style={{
        minHeight: 32,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 16 }}
        numberOfLines={2}
        maxFontSizeMultiplier={1.2}
      >
        {tag}
      </Text>
    </View>
  );

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {tags.map(chip)}
      </ScrollView>
    );
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {tags.map(chip)}
    </View>
  );
});
