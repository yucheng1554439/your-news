import type { ReactNode } from "react";
import type { Story } from "@/lib/types";

interface StoryIntelligenceProps {
  story: Story;
  whyItMattersToYou?: string | null;
}

function IntelligenceBlock({
  title,
  children,
  variant = "default",
}: {
  title: string;
  children: ReactNode;
  variant?: "default" | "emphasis";
}) {
  if (!children) return null;

  if (variant === "emphasis") {
    return (
      <section className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/40 p-6">
        <h2 className="font-serif text-xl text-white">{title}</h2>
        <div className="leading-relaxed text-zinc-300">{children}</div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-[0.15em] text-zinc-500">
        {title}
      </h2>
      <div className="text-base leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

export function StoryIntelligence({
  story,
  whyItMattersToYou,
}: StoryIntelligenceProps) {
  const hasEconomic =
    story.economicImplications &&
    story.economicImplications.length > 40;

  return (
    <div className="mt-10 space-y-10">
      <IntelligenceBlock title="The Briefing">{story.summary}</IntelligenceBlock>

      <IntelligenceBlock title="Why It Matters" variant="emphasis">
        {story.whyItMatters}
      </IntelligenceBlock>

      {whyItMattersToYou && (
        <section className="space-y-3 rounded-xl border border-white/15 bg-zinc-900/60 p-6">
          <h2 className="font-serif text-xl text-white">
            Why This Matters To You
          </h2>
          <p className="leading-relaxed text-zinc-300">{whyItMattersToYou}</p>
        </section>
      )}

      {hasEconomic && (
        <IntelligenceBlock title="Strategic Implications">
          {story.economicImplications}
        </IntelligenceBlock>
      )}

      {story.perspectives && (
        <IntelligenceBlock title="Perspectives">
          {story.perspectives}
        </IntelligenceBlock>
      )}

      {story.marketReaction && (
        <IntelligenceBlock title="Market Read">
          {story.marketReaction}
        </IntelligenceBlock>
      )}

      {story.sourceContext && (
        <IntelligenceBlock title="Source Lens">
          {story.sourceContext}
        </IntelligenceBlock>
      )}
    </div>
  );
}
