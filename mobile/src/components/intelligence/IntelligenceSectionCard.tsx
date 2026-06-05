import { Text, View } from "react-native";
import { splitTextIntoChunks } from "@/lib/text-chunks";
import { colors, radii, spacing, typography } from "@/theme";

type IntelligenceSectionCardProps = {
  label: string;
  body: string;
  highlight?: boolean;
  disclaimer?: string;
  isFallback?: boolean;
  /** Lead section (e.g. The Briefing) uses open layout; others use elevated cards. */
  variant?: "lead" | "card";
};

export function IntelligenceSectionCard({
  label,
  body,
  highlight,
  disclaimer,
  variant = "card",
}: IntelligenceSectionCardProps) {
  const chunks = splitTextIntoChunks(body, variant === "lead" ? 4 : 3);
  const isLead = variant === "lead";

  return (
    <View
      style={{
        gap: spacing.sm,
        ...(isLead
          ? {}
          : {
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: highlight ? colors.borderStrong : colors.border,
              backgroundColor: highlight ? colors.surfaceRaised : colors.surface,
              padding: spacing.lg,
            }),
      }}
    >
      <Text
        style={{
          ...(isLead ? typography.title : typography.eyebrow),
          color: colors.textSectionLabel,
          fontWeight: "600",
        }}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>

      {disclaimer ? (
        <View
          style={{
            borderRadius: radii.sm,
            backgroundColor: "rgba(120,53,15,0.25)",
            padding: spacing.sm,
          }}
        >
          <Text style={{ color: "#fcd34d", fontSize: 13, lineHeight: 20 }}>
            {disclaimer}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: spacing.md, maxWidth: 680 }}>
        {chunks.map((chunk, i) => (
          <Text
            key={i}
            style={{
              ...typography.body,
              color: colors.textBody,
              fontSize: isLead ? 17 : 16,
              lineHeight: isLead ? 26 : 24,
            }}
            maxFontSizeMultiplier={1.3}
          >
            {chunk}
          </Text>
        ))}
      </View>
    </View>
  );
}
