import * as Haptics from "expo-haptics";

export async function hapticLight() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* simulator */
  }
}

export async function hapticSelection() {
  try {
    await Haptics.selectionAsync();
  } catch {
    /* simulator */
  }
}

export async function hapticRefresh() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* simulator */
  }
}
