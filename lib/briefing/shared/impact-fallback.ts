import type { OnboardingProfile } from "@/lib/types";
import type { UserIntelligenceProfile } from "@/lib/personalization/user-intelligence-types";
import type { IntelligenceBriefing } from "@/lib/briefing/types";

/** Client-safe impact fallback when whyYou is missing from API payload. */
export function deriveImpactFallbackFromBriefing(
  briefing: IntelligenceBriefing,
  profile: OnboardingProfile | null,
  userIntelligence?: UserIntelligenceProfile | null
): string {
  const provenance = briefing.provenance;
  const stories = provenance?.storiesProcessed ?? provenance?.articleCount ?? 0;
  const narratives =
    provenance?.narrativesProcessed ?? provenance?.narrativeCount ?? 0;
  const sources = provenance?.sourcesProcessed ?? provenance?.sourceCount ?? 0;

  const interests: string[] = [];
  if (profile?.interests?.length) interests.push(...profile.interests);
  for (const t of userIntelligence?.primaryThemes ?? []) {
    if (t.label) interests.push(t.label);
  }
  for (const id of profile?.topicPreferences?.moreOf ?? []) {
    interests.push(id.replace(/-/g, " "));
  }
  const focus =
    interests.length > 0
      ? [...new Set(interests.map((i) => i.trim()).filter(Boolean))]
          .slice(0, 5)
          .join(", ")
      : "your stated priorities";

  const career = profile?.career ?? "professional";
  const headline = briefing.headline?.trim();
  const overviewLead = briefing.whatChanged?.split(/[.!?]/)[0]?.trim();

  if (briefing.mode === "for-you") {
    const lens =
      career === "engineer"
        ? "engineering roadmaps, infrastructure spend, vendor selection, and hiring pace"
        : career === "investor"
          ? "portfolio exposure, capital allocation, and sector positioning"
          : career === "founder"
            ? "GTM timing, fundraising assumptions, and competitive positioning"
            : "operating decisions, budget trade-offs, and strategic priorities";

    const threadHint =
      narratives > 1
        ? `${narratives} narrative threads`
        : "multiple reporting threads";
    const headlineClause = headline
      ? ` The dominant pattern — ${headline.slice(0, 100)} —`
      : overviewLead
        ? ` The lead development — ${overviewLead.slice(0, 120)} —`
        : "";

    return `This intelligence brief draws on ${stories} stories from ${sources} sources across ${threadHint}, filtered through your focus on ${focus}.${headlineClause} may affect ${lens}. Treat corroboration across outlets as the signal — single-source claims need confirmation before you change commitments. Watch which threads gain follow-up reporting in the next 2–3 weeks.`;
  }

  const globalLead = overviewLead ?? headline ?? "Several developments moved in parallel";
  return `Across ${stories} stories and ${narratives} narrative clusters from ${sources} sources, the through-line is: ${globalLead}. The pattern matters because it may shift policy, capital flows, or competitive positioning if follow-up reporting confirms direction.`;
}

export function isNoDirectImpactText(text: string | undefined | null): boolean {
  if (!text?.trim()) return true;
  return /no direct impact detected/i.test(text);
}

export function isGenericBriefingSection(text: string | undefined | null): boolean {
  if (!text?.trim()) return true;
  const t = text.trim();
  if (t.length < 40) return true;
  const generic = [
    /no direct impact detected/i,
    /no major shift detected/i,
    /monitor whether new reporting changes the strategic picture/i,
    /sets context for how strategic themes may evolve/i,
    /watch for follow-up reporting, official responses/i,
  ];
  return generic.some((re) => re.test(t));
}
