import type { Story } from "@/lib/types";

interface StoryIntelligenceProps {
  story: Story;
  whyItMattersToYou?: string | null;
}

export function StoryIntelligence({
  story,
  whyItMattersToYou,
}: StoryIntelligenceProps) {
  return (
    <div className="mt-10 space-y-8">
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.15em] text-zinc-500">
          The Briefing
        </h2>
        <p className="text-base leading-relaxed text-zinc-300">
          {story.summary}
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/40 p-6">
        <h2 className="font-serif text-xl text-white">Why It Matters</h2>
        <p className="leading-relaxed text-zinc-300">{story.whyItMatters}</p>
      </section>

      {whyItMattersToYou && (
        <section className="space-y-3 rounded-xl border border-white/15 bg-zinc-900/60 p-6">
          <h2 className="font-serif text-xl text-white">
            Why This Matters To You
          </h2>
          <p className="leading-relaxed text-zinc-300">{whyItMattersToYou}</p>
        </section>
      )}
    </div>
  );
}
