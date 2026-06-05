import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  useRefreshIntelligence,
  type IntelligenceRefreshStatus,
} from "@/hooks/useRefreshIntelligence";
import { colors, radii, spacing, typography } from "@/theme";

type IntelligenceRefreshControlProps = {
  lastUpdated: number | null;
  storiesFetchedAt?: number | null;
  persistenceConfigured?: boolean;
};

export function formatIntelligenceTimestamp(ms: number | null): string {
  if (!ms) return "Not generated yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

export function IntelligenceRefreshControl({
  lastUpdated,
  storiesFetchedAt,
  persistenceConfigured = true,
}: IntelligenceRefreshControlProps) {
  const {
    refresh,
    isRefreshing,
    status,
    statusMessage,
    clearStatus,
  } = useRefreshIntelligence();

  const displayUpdated = lastUpdated ?? storiesFetchedAt ?? null;

  useEffect(() => {
    if (status !== "success" && status !== "error") return;
    const t = setTimeout(() => clearStatus(), 4000);
    return () => clearTimeout(t);
  }, [status, clearStatus]);

  const message = isRefreshing
    ? "Refreshing intelligence..."
    : statusMessage;

  return (
    <View style={{ gap: spacing.sm, alignItems: "flex-start" }}>
      <Text style={{ ...typography.caption, color: colors.textMeta }}>
        Last updated {formatIntelligenceTimestamp(displayUpdated)}
      </Text>

      {!persistenceConfigured ? (
        <Text
          style={{
            ...typography.caption,
            color: "#fbbf24",
            maxWidth: 320,
            lineHeight: 18,
          }}
        >
          Redis/KV is not configured on the server — intelligence cannot be
          regenerated until persistence is enabled.
        </Text>
      ) : null}

      <Pressable
        onPress={() => refresh()}
        disabled={!persistenceConfigured || isRefreshing}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 10,
          opacity: !persistenceConfigured || isRefreshing ? 0.55 : 1,
        })}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : null}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1.1,
            textTransform: "uppercase",
            color: colors.text,
          }}
        >
          Refresh Intelligence
        </Text>
      </Pressable>

      {message ? (
        <StatusLine status={status} message={message} />
      ) : null}
    </View>
  );
}

function StatusLine({
  status,
  message,
}: {
  status: IntelligenceRefreshStatus;
  message: string;
}) {
  const color =
    status === "error"
      ? "#f87171"
      : status === "success"
        ? colors.success
        : colors.textMuted;

  return (
    <Text style={{ fontSize: 13, color, lineHeight: 18 }} maxFontSizeMultiplier={1.2}>
      {message}
    </Text>
  );
}
