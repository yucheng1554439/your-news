import { Stack, useRouter } from "expo-router";
import { useMemo, type ReactNode } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TagRow } from "@/components/ui/TagRow";
import { BriefingSkeleton } from "@/components/ui/Skeleton";
import { FeedErrorBanner } from "@/components/ui/primitives";
import { useProfileIntelligence } from "@/hooks/useProfileIntelligence";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { colors, radii, spacing, typography } from "@/theme";

const CONFIDENCE_COPY: Record<string, string> = {
  Strong:
    "Your profile is heavily influenced by saved stories and deep reads.",
  Growing:
    "Reading behavior is refining rankings alongside your stated interests.",
  Early:
    "We are still learning from opens and saves — preferences lead for now.",
  Onboarding:
    "Complete more reading and saves to strengthen behavioral signals.",
};

export default function IntelligenceProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, error, refetch } = useProfileIntelligence();
  const { refreshing, onRefresh } = usePullRefresh(() => refetch());

  const confidenceHint = useMemo(() => {
    if (!data) return "";
    return (
      CONFIDENCE_COPY[data.behavior.behaviorConfidenceLabel] ??
      data.behavior.summary
    );
  }, [data]);

  return (
    <>
      <Stack.Screen options={{ title: "Intelligence Profile" }} />
      {isPending && !data ? (
        <BriefingSkeleton />
      ) : isError || !data ? (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            padding: spacing.lg,
            paddingTop: insets.top,
          }}
        >
          <FeedErrorBanner
            message={
              error?.message ??
              "Complete onboarding to see how Your News personalizes your feed."
            }
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.bg }}
          contentContainerStyle={{
            padding: spacing.md,
            gap: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 8 }}>
            <Text style={{ ...typography.caption, color: colors.textMuted }}>
              How Your News sees your interests
            </Text>
            <Text
              style={{ ...typography.hero, fontSize: 28, color: colors.text }}
              maxFontSizeMultiplier={1.2}
            >
              {data.effectiveLens}
            </Text>
            <Text style={{ ...typography.body, color: colors.textSecondary }}>
              Your intelligence lens combines identity, reading behavior, topic
              preferences, and saved stories — not generic trending topics.
            </Text>
          </View>

          <IntelSection title="Identity" subtitle="Who you told us you are">
            <IdentityRow label="Career" value={data.identity.career} />
            <IdentityRow
              label="Interests"
              value={
                data.identity.interests.length > 0
                  ? data.identity.interests.join(" · ")
                  : null
              }
            />
            <IdentityRow label="Focus" value={data.identity.focus} />
            <IdentityRow label="Tone" value={data.identity.tone} />
          </IntelSection>

          <IntelSection
            title="Reading Behavior"
            subtitle="How you actually engage with coverage"
          >
            <MetricGrid
              metrics={[
                {
                  label: "Stories Opened",
                  value: String(data.behavior.storiesOpened),
                  hint: "Opens in this account — used to detect themes you explore.",
                },
                {
                  label: "Deep Reads",
                  value: String(data.behavior.deepReads),
                  hint: "Stories you spent meaningful time on (30s+). Strong personalization signal.",
                },
                {
                  label: "Stories Saved",
                  value: String(data.behavior.storiesSaved),
                  hint: "Bookmarks train which themes and entities rise in your feed.",
                },
                {
                  label: "Behavior Confidence",
                  value: data.behavior.behaviorConfidenceLabel,
                  hint: confidenceHint,
                },
              ]}
            />
            <InsightCallout title="Summary" body={data.behavior.summary} />
          </IntelSection>

          <IntelSection
            title="Primary Themes"
            subtitle="Dominant topics in your current lens"
          >
            {data.primaryThemes.length === 0 ? (
              <Text style={{ color: colors.textMuted }}>
                Not enough signal yet — save stories or read deeply to surface
                themes.
              </Text>
            ) : (
              <TagRow tags={data.primaryThemes} />
            )}
          </IntelSection>

          {data.emergingThemes.length > 0 ? (
            <IntelSection
              title="Emerging Themes"
              subtitle="Themes gaining weight from recent reading"
            >
              <TagRow tags={data.emergingThemes} />
            </IntelSection>
          ) : null}

          <IntelSection
            title="Topic Preferences"
            subtitle="Explicit controls you set in settings"
          >
            <PrefBlock
              title="More of"
              items={data.preferences.moreOf}
              empty="No boosts yet — add topics you want amplified."
            />
            <PrefBlock
              title="Less of"
              items={data.preferences.lessOf}
              empty="No reductions — stories in these topics rank lower."
            />
            <PrefBlock
              title="Never show"
              items={data.preferences.neverShow}
              empty="No hard blocks — add topics to hide entirely."
            />
            <Pressable
              onPress={() => router.push("/(app)/settings/topics")}
              style={{ marginTop: spacing.sm }}
            >
              <Text
                style={{ color: colors.accent, fontSize: 14, fontWeight: "600" }}
              >
                Edit topic preferences →
              </Text>
            </Pressable>
          </IntelSection>

          <IntelSection
            title="Saved Story Influence"
            subtitle="How bookmarks shape your lens"
          >
            <InsightCallout body={data.savedInfluence.summary} />
            {data.savedInfluence.themes.length > 0 ? (
              <TagRow tags={data.savedInfluence.themes} />
            ) : null}
          </IntelSection>

          <IntelSection title="Behavior Insights" subtitle="What the engine infers">
            <InsightCallout
              body={`${data.behavior.summary} ${confidenceHint}`}
            />
          </IntelSection>
        </ScrollView>
      )}
    </>
  );
}

function IntelSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ ...typography.title, color: colors.text }}>{title}</Text>
        {subtitle ? (
          <Text style={{ ...typography.caption, color: colors.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function IdentityRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontSize: 11,
          color: colors.textMuted,
          letterSpacing: 1.2,
          fontWeight: "600",
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </View>
  );
}

function MetricGrid({
  metrics,
}: {
  metrics: { label: string; value: string; hint: string }[];
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {metrics.map((m) => (
        <View
          key={m.label}
          style={{
            borderRadius: radii.md,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
            gap: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {m.label}
            </Text>
            <Text
              style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}
            >
              {m.value}
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 20,
            }}
            maxFontSizeMultiplier={1.25}
          >
            {m.hint}
          </Text>
        </View>
      ))}
    </View>
  );
}

function InsightCallout({
  title,
  body,
}: {
  title?: string;
  body: string;
}) {
  return (
    <View
      style={{
        borderRadius: radii.md,
        backgroundColor: colors.surfaceRaised,
        padding: spacing.md,
        gap: 6,
      }}
    >
      {title ? (
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: colors.textMuted,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
      ) : null}
      <Text
        style={{ color: "#d4d4d8", fontSize: 15, lineHeight: 22 }}
        maxFontSizeMultiplier={1.3}
      >
        {body}
      </Text>
    </View>
  );
}

function PrefBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600" }}>
        {title}
      </Text>
      {items.length > 0 ? (
        <TagRow tags={items} />
      ) : (
        <Text style={{ color: colors.textDim, fontSize: 14 }}>{empty}</Text>
      )}
    </View>
  );
}
