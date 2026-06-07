import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
} from "react-native";
import { deleteAccount } from "@/api/endpoints";
import { colors, radii, spacing, typography } from "@/theme";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { getToken, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const performDelete = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not signed in");
      }
      await deleteAccount(token);
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (err) {
      Alert.alert(
        "Deletion failed",
        err instanceof Error ? err.message : "Please try again or contact support."
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account, saved stories, preferences, and personalized intelligence. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => void performDelete(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
    >
      <Text style={{ ...typography.body, color: colors.textMuted, lineHeight: 22 }}>
        Deleting your account removes your Clerk login, onboarding profile, topic
        preferences, saved stories, and For You intelligence snapshots from our
        servers.
      </Text>
      <Text style={{ ...typography.body, color: colors.textMuted, lineHeight: 22 }}>
        Global news content and shared intelligence are not affected. You may
        create a new account later, but previous data cannot be restored.
      </Text>

      <Pressable
        onPress={confirmDelete}
        disabled={loading}
        style={{
          backgroundColor: colors.danger,
          padding: spacing.md,
          borderRadius: radii.md,
          opacity: loading ? 0.7 : 1,
          marginTop: spacing.sm,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            Delete my account permanently
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
