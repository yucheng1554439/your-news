import { getCategoryLabel } from "@/lib/data/categories";
import { hasPersonalizationProfile } from "@/lib/intelligence/profile-context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

function buildTheBriefing(story: Story): string {
  const category = getCategoryLabel(story.category);
  const source = story.rawExcerpt ?? story.summary;
  return `${story.source} reports a developing ${category.toLowerCase()} story: ${source}`.slice(
    0,
    380
  );
}

function buildWhyItMatters(story: Story): string {
  const category = getCategoryLabel(story.category);
  return `Beyond the headline, this ${category.toLowerCase()} thread may influence policy expectations, capital allocation, and how institutions hedge uncertainty over the coming weeks. Watch whether follow-on reporting confirms a trend or a one-day narrative.`.slice(
    0,
    420
  );
}

function buildPersonalizedWhy(
  story: Story,
  profile: OnboardingProfile
): string {
  const category = getCategoryLabel(story.category).toLowerCase();
  const careerOpeners: Record<
    NonNullable<OnboardingProfile["career"]>,
    string
  > = {
    engineer: `For your engineering lens, this ${category} item matters if it changes build-vs-buy calculus, vendor risk, or the pace of automation in your stack.`,
    investor: `For your investment lens, this ${category} development is a positioning question: does it reprice risk assets, alter sector leadership, or remain idiosyncratic noise?`,
    founder: `For your founder lens, treat this ${category} story as a narrative and execution signal — it may affect fundraising tone, hiring plans, or competitive timing.`,
    executive: `For your executive lens, this ${category} coverage is about institutional exposure: where it shows up in planning, board conversation, or external communications.`,
    researcher: `For your research lens, this ${category} thread is worth tracking if it shifts evidence, funding priorities, or the policy boundary around your field.`,
  };

  const opener = profile.career
    ? careerOpeners[profile.career]
    : `Given your briefing setup, this ${category} story deserves a deliberate read.`;

  const focusNote =
    profile.focusType === "breaking"
      ? "Given your breaking-signal preference, treat this as queue-worthy until disconfirmed."
      : profile.focusType === "depth"
        ? "Given your depth preference, skim the headline only if time is constrained."
        : "Fit this into your weekly scan unless it escalates.";

  return `${opener} ${focusNote}`.slice(0, 500);
}

export function buildFallbackIntelligence(
  story: Story,
  profile: OnboardingProfile | null,
  profileFingerprint: string
): StoryIntelligencePackage {
  const theBriefing = buildTheBriefing(story);
  const whyItMatters = buildWhyItMatters(story);

  return {
    theBriefing,
    whyItMatters,
    whyItMattersToYou:
      profile && hasPersonalizationProfile(profile)
        ? buildPersonalizedWhy(story, profile)
        : undefined,
    strategicImplications: story.economicImplications,
    perspectives: `Operators, investors, and policymakers will read the same facts with different urgency — the split is usually between those who must act this quarter and those who can wait for confirmation.`,
    marketRead:
      story.category === "markets" || story.economicImplications
        ? `Trading desks will look for confirmation in rates, credit spreads, and sector leaders before treating this as a durable repricing event.`
        : undefined,
    sourceLens: `${story.source} is one datapoint; compare wire services and trade press before treating framing as consensus.`,
    generatedAt: new Date().toISOString(),
    profileFingerprint,
  };
}
