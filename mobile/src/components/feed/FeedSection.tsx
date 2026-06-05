import { ReactNode } from "react";
import { Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme";
import { Eyebrow, SectionHeader } from "@/components/ui/primitives";

type FeedSectionProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  variant?: "default" | "lead" | "signals" | "more";
};

export function FeedSection({
  eyebrow,
  title,
  subtitle,
  children,
  variant = "default",
}: FeedSectionProps) {
  const isLead = variant === "lead";
  const isSignals = variant === "signals";

  return (
    <View
      style={{
        gap: spacing.md,
        paddingTop: isLead ? 0 : spacing.sm,
        paddingBottom: spacing.sm,
        borderTopWidth: isLead ? 0 : 1,
        borderTopColor: colors.border,
      }}
    >
      {isLead ? (
        <Eyebrow>{eyebrow ?? "Lead Story"}</Eyebrow>
      ) : (
        <View style={{ gap: 4 }}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <SectionHeader title={title} subtitle={subtitle} />
        </View>
      )}

      {isSignals ? (
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 2,
          }}
        >
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View
      style={{
        padding: spacing.lg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: 8,
      }}
    >
      <Text style={{ ...typography.headline, color: colors.text }}>{title}</Text>
      <Text style={{ ...typography.caption, color: colors.textMuted, lineHeight: 20 }}>
        {message}
      </Text>
    </View>
  );
}
