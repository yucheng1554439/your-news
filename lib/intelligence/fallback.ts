import { getCategoryLabel } from "@/lib/data/categories";
import { canGeneratePersonalizedSection } from "@/lib/intelligence/profile-context";
import type { StoryIntelligencePackage } from "@/lib/intelligence/types";
import type { OnboardingProfile, Story } from "@/lib/types";

function buildTheBriefing(story: Story): string {
  const excerpt = story.rawExcerpt ?? story.summary;
  return excerpt.slice(0, 360);
}

function inferConsequenceDomain(story: Story): string {
  const tags = story.tags;
  if (tags.includes("markets") || tags.includes("investing")) {
    return "prices, earnings expectations, and who gains or loses market share";
  }
  if (tags.includes("policy") || tags.includes("geopolitics")) {
    return "regulatory timelines, trade routes, and government leverage";
  }
  if (tags.includes("ai") || tags.includes("semiconductors")) {
    return "compute supply, product roadmaps, and who can ship faster";
  }
  if (tags.includes("energy")) {
    return "power costs, commodity supply, and industrial capex";
  }
  if (tags.includes("cybersecurity")) {
    return "incident response spend, vendor trust, and compliance deadlines";
  }
  return `how ${getCategoryLabel(story.category).toLowerCase()} players adjust plans and spending`;
}

function buildWhyItMatters(story: Story): string {
  const domain = inferConsequenceDomain(story);
  const lead = (story.rawExcerpt ?? story.summary).split(/[.!?]/)[0]?.trim();
  const hook = lead ? `${lead}. ` : "";
  return `${hook}If reporting holds, the practical angle is ${domain} — check the next primary-source update before acting.`.slice(
    0,
    420
  );
}

function buildPersonalizedWhy(
  story: Story,
  profile: OnboardingProfile
): string {
  const career = profile.career ?? "professional";
  const domain = inferConsequenceDomain(story);
  const interests =
    profile.interests.length > 0
      ? profile.interests.join(" and ")
      : "your coverage areas";

  const careerHook: Record<NonNullable<OnboardingProfile["career"]>, string> = {
    investor: `For your portfolio lens on ${interests}, this feeds ${domain} — decide if you need to resize exposure before the next data print.`,
    engineer: `For your engineering work on ${interests}, this pressures ${domain} — decide if roadmap, vendors, or hiring assumptions need updating this sprint.`,
    founder: `For your company in ${interests}, this hits ${domain} — decide if pitch, pricing, or competitive messaging needs a refresh before your next customer cycle.`,
    executive: `For your org focused on ${interests}, this affects ${domain} — assign an owner to quantify exposure within the week.`,
    researcher: `For your research on ${interests}, this touches ${domain} — pull primary sources to test whether the claim holds up.`,
  };

  const line = profile.career
    ? careerHook[profile.career]
    : `Given your focus on ${interests}, map how this changes a decision you own.`;

  return `As a ${career}, ${line}`.slice(0, 480);
}

export function buildFallbackIntelligence(
  story: Story,
  profile: OnboardingProfile | null,
  profileFingerprint: string
): StoryIntelligencePackage {
  return {
    theBriefing: buildTheBriefing(story),
    whyItMatters: buildWhyItMatters(story),
    whyItMattersToYou:
      profile && canGeneratePersonalizedSection(profile)
        ? buildPersonalizedWhy(story, profile)
        : undefined,
    generatedAt: new Date().toISOString(),
    profileFingerprint,
    generatedBy: "fallback",
  };
}
