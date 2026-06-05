import type { Story } from "@/lib/types";
import {
  INTELLIGENCE_BODY_COLOR,
  INTELLIGENCE_SECTION_LABEL_COLOR,
} from "@/lib/briefing/shared/typography";
import { resolveStoryIntelSections } from "@/lib/intelligence/story-sections";

interface StoryIntelligenceProps {
  story: Story;
  whyItMattersToYou?: string | null;
}

export function StoryIntelligence({
  story,
  whyItMattersToYou,
}: StoryIntelligenceProps) {
  const sections = resolveStoryIntelSections(story, whyItMattersToYou);

  return (
    <div className="mt-10 space-y-8">
      <section className="space-y-3">
        <h2
          className="text-xs uppercase tracking-[0.15em]"
          style={{ color: INTELLIGENCE_SECTION_LABEL_COLOR }}
        >
          {sections.briefing.title}
        </h2>
        {sections.briefing.disclaimer && (
          <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm leading-relaxed text-amber-100/90">
            {sections.briefing.disclaimer}
          </p>
        )}
        <p className="text-base leading-relaxed" style={{ color: INTELLIGENCE_BODY_COLOR }}>
          {sections.briefing.body}
        </p>
        {(story.intelligenceGeneratedBy === "metadata" || story.paywallDetected) &&
          story.corroboratingSlugs &&
          story.corroboratingSlugs.length > 0 && (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              Corroborated against {story.corroboratingSlugs.length} other{" "}
              {story.corroboratingSlugs.length === 1 ? "story" : "stories"} in
              the pool.
            </p>
          )}
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/40 p-6">
        <h2
          className="font-serif text-xl"
          style={{ color: INTELLIGENCE_SECTION_LABEL_COLOR }}
        >
          {sections.whyItMatters.title}
        </h2>
        <p className="leading-relaxed" style={{ color: INTELLIGENCE_BODY_COLOR }}>
          {sections.whyItMatters.body}
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-white/15 bg-zinc-900/60 p-6">
        <h2
          className="font-serif text-xl"
          style={{ color: INTELLIGENCE_SECTION_LABEL_COLOR }}
        >
          {sections.whyItMattersToYou.title}
        </h2>
        <p className="leading-relaxed" style={{ color: INTELLIGENCE_BODY_COLOR }}>
          {sections.whyItMattersToYou.body}
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-6">
        <h2
          className="font-serif text-xl"
          style={{ color: INTELLIGENCE_SECTION_LABEL_COLOR }}
        >
          {sections.whatToWatch.title}
        </h2>
        <p className="leading-relaxed" style={{ color: INTELLIGENCE_BODY_COLOR }}>
          {sections.whatToWatch.body}
        </p>
      </section>
    </div>
  );
}
