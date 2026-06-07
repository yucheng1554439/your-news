import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LegalLinksSection } from "@/components/auth/AuthLegalFooter";
import { colors, radii, spacing, typography } from "@/theme";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          padding: spacing.md,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          gap: 4,
          marginBottom: spacing.sm,
        }}
      >
        <Text style={{ ...typography.caption, color: colors.textMuted }}>
          Signed in as
        </Text>
        <Text style={{ ...typography.headline, color: colors.text }}>
          {user?.primaryEmailAddress?.emailAddress ?? "—"}
        </Text>
      </View>

      <SettingsRow
        label="Intelligence Profile"
        subtitle="How Your News sees your interests"
        onPress={() => router.push("/(app)/settings/intelligence")}
      />
      <SettingsRow
        label="Topic preferences"
        subtitle="Control what appears in your feed"
        onPress={() => router.push("/(app)/settings/topics")}
      />

      <View
        style={{
          padding: spacing.md,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          gap: spacing.sm,
          marginTop: spacing.sm,
        }}
      >
        <Text style={{ ...typography.headline, color: colors.text, fontSize: 16 }}>
          Legal & support
        </Text>
        <LegalLinksSection />
      </View>

      <SettingsRow
        label="Delete account"
        subtitle="Permanently remove your data"
        destructive
        onPress={() => router.push("/(app)/settings/delete-account")}
      />
      <SettingsRow
        label="Sign out"
        destructive
        onPress={() => void signOut()}
      />
    </ScrollView>
  );
}

function SettingsRow({
  label,
  subtitle,
  onPress,
  destructive,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: 4,
      })}
    >
      <Text
        style={{
          ...typography.headline,
          color: destructive ? colors.danger : colors.text,
          fontSize: 16,
        }}
      >
        {label}
      </Text>
      {subtitle ? (
        <Text style={{ ...typography.caption, color: colors.textMuted }}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}
