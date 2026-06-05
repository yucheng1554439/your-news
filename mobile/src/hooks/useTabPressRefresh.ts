import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useEffect, type RefObject } from "react";
import type { ScrollView } from "react-native";
import { hapticRefresh } from "@/lib/haptics";

/** Second tap on active tab: scroll to top + refresh (Instagram-style). */
export function useTabPressRefresh(
  scrollRef: RefObject<ScrollView | null>,
  onRefresh: () => void
) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    const tabNav = navigation.getParent();
    if (!tabNav) return;

    const unsub = (
      tabNav as {
        addListener: (event: "tabPress", callback: () => void) => () => void;
      }
    ).addListener("tabPress", () => {
      if (!isFocused) return;
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      onRefresh();
      void hapticRefresh();
    });
    return unsub;
  }, [navigation, isFocused, onRefresh, scrollRef]);
}
