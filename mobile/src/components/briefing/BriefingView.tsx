import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { BriefingSectionPager } from "@/components/briefing/BriefingSectionPager";
import { resolveBriefingDateDisplay } from "@/lib/briefing-dates";
import {
  buildBriefingSections,
  intelligenceModeLabel,
} from "@/lib/briefing-display";
import type { BriefingActionContext } from "@/lib/briefing-action";
import type { IntelligenceBriefing } from "@/types";
import { colors, radii, spacing, typography } from "@/theme";

type BriefingViewProps = {
  briefing: IntelligenceBriefing;
  intelligenceUpdatedAt?: number | null;
  personalization?: BriefingActionContext;
};

export function BriefingView({
  briefing,
  intelligenceUpdatedAt,
  personalization,
}: BriefingViewProps) {
  const sections = useMemo(
    () => buildBriefingSections(briefing, personalization),
    [briefing, personalization]
  );

  const pagerKey = `${briefing.mode}-${briefing.headline}`;
  const dateDisplay = resolveBriefingDateDisplay(
    briefing,
    intelligenceUpdatedAt ?? null
  );
  const provenance = briefing.provenance;
  const storiesProcessed =
    provenance?.storiesProcessed ?? provenance?.articleCount ?? 0;
  const narrativesProcessed =
    provenance?.narrativesProcessed ?? provenance?.narrativeCount ?? 0;
  const sourcesProcessed =
    provenance?.sourcesProcessed ?? provenance?.sourceCount ?? 0;
  const signalsProcessed = provenance?.signalsProcessed ?? 0;

  useEffect(() => {
    if (!provenance) return;
    console.log(
      "[BRIEFING_VERIFY] render",
      JSON.stringify({
        mode: briefing.mode,
        storiesProcessed,
        sourcesProcessed,
        narrativesProcessed,
        signalsProcessed,
        generatedBy: briefing.generatedBy,
      })
    );
  }, [
    briefing.mode,
    briefing.generatedBy,
    storiesProcessed,
    sourcesProcessed,
    narrativesProcessed,
    signalsProcessed,
    provenance,
  ]);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.eyebrow, color: colors.textSectionLabel }}>
          {intelligenceModeLabel(briefing.mode)}
        </Text>

        {dateDisplay.coverageLine ? (
          <Text
            style={{
              fontSize: 15,
              color: colors.textMeta,
              fontWeight: "500",
            }}
            maxFontSizeMultiplier={1.2}
          >
            {dateDisplay.coverageLine}
          </Text>
        ) : null}

        <BriefingMetaRow
          dateDisplay={dateDisplay}
          storiesProcessed={storiesProcessed}
          sourcesProcessed={sourcesProcessed}
        />

        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            lineHeight: 34,
            letterSpacing: -0.4,
            color: colors.text,
          }}
          maxFontSizeMultiplier={1.15}
        >
          {briefing.headline}
        </Text>
      </View>

      <BriefingSectionPager sections={sections} resetKey={pagerKey} />

      {provenance && sourcesProcessed > 0 ? (
        <View
          style={{
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Text style={{ ...typography.eyebrow, color: colors.textSectionLabel }}>
            Source Coverage
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: colors.textMeta,
              lineHeight: 20,
            }}
          >
            {storiesProcessed} stories processed ·{" "}
            {narrativesProcessed} narratives · {sourcesProcessed}{" "}
            sources · {signalsProcessed} signals
          </Text>
          {provenance.sources.length > 0 ? (
            <Text
              style={{ color: colors.textMeta, fontSize: 12, lineHeight: 18 }}
              numberOfLines={4}
            >
              {provenance.sources.slice(0, 10).join(" · ")}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function BriefingMetaRow({
  dateDisplay,
  storiesProcessed,
  sourcesProcessed,
}: {
  dateDisplay: ReturnType<typeof resolveBriefingDateDisplay>;
  storiesProcessed: number;
  sourcesProcessed: number;
}) {
  const items = [
    dateDisplay.lastUpdatedLine,
    storiesProcessed > 0 ? `${storiesProcessed} stories processed` : null,
    sourcesProcessed > 0 ? `${sourcesProcessed} sources processed` : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <Text
      style={{
        fontSize: 12,
        lineHeight: 18,
        color: colors.textMeta,
      }}
      maxFontSizeMultiplier={1.2}
    >
      {items.join("  ·  ")}
    </Text>
  );
}
