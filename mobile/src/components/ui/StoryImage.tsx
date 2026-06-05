import { Image } from "expo-image";
import { memo } from "react";
import { ImageStyle, StyleProp } from "react-native";

type StoryImageProps = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain";
  priority?: "low" | "normal" | "high";
};

export const StoryImage = memo(function StoryImage({
  uri,
  style,
  contentFit = "cover",
  priority = "normal",
}: StoryImageProps) {
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      transition={200}
      cachePolicy="memory-disk"
      priority={priority}
    />
  );
});
