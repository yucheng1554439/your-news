import { memo } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import {
  TOP_STORY_CATEGORIES,
  type TopStoryCategory,
} from "@/lib/category-filter";
import { hapticSelection } from "@/lib/haptics";
import { colors, radii } from "@/theme";

export const CategoryFilterBar = memo(function CategoryFilterBar({
  value,
  onChange,
}: {
  value: TopStoryCategory;
  onChange: (id: TopStoryCategory) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {TOP_STORY_CATEGORIES.map((cat) => {
        const active = cat.id === value;
        return (
          <Pressable
            key={cat.id}
            onPress={() => {
              void hapticSelection();
              onChange(cat.id);
            }}
            style={{
              minHeight: 36,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radii.pill,
              backgroundColor: active ? colors.text : colors.surface,
              borderWidth: 1,
              borderColor: active ? colors.text : colors.border,
            }}
          >
            <Text
              style={{
                color: active ? colors.bg : colors.textSecondary,
                fontSize: 13,
                fontWeight: active ? "600" : "400",
              }}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});
