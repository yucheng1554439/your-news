import type { Story } from "@/lib/types";
import { PAYWALL_SIGNAL_DISCLAIMER, METADATA_SIGNAL_DISCLAIMER } from "@/lib/extraction/paywall";

interface StoryIntelligenceProps {
  story: Story;
  whyItMattersToYou?: string | null;
}

export function StoryIntelligence({
  story,
  whyItMattersToYou,
}: StoryIntelligenceProps) {
  const isMetadataSignal =
    story.intelligenceGeneratedBy === "metadata" || Boolean(story.paywallDetected);
  const briefingTitle = isMetadataSignal ? "Signal Summary" : "The Briefing";
  const disclaimer =
    story.signalSummaryDisclaimer?.trim() ||
    (story.paywallDetected
      ? PAYWALL_SIGNAL_DISCLAIMER
      : METADATA_SIGNAL_DISCLAIMER);

  return (
    <div className="mt-10 space-y-8">
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.15em] text-zinc-500">
          {briefingTitle}
        </h2>
        {isMetadataSignal && (
          <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm leading-relaxed text-amber-100/90">
            {disclaimer}
          </p>
        )}
        <p className="text-base leading-relaxed text-zinc-300">
          {story.summary}
        </p>
        {isMetadataSignal && story.corroboratingSlugs && story.corroboratingSlugs.length > 0 && (
          <p className="text-xs text-zinc-500">
            Corroborated against {story.corroboratingSlugs.length} other{" "}
            {story.corroboratingSlugs.length === 1 ? "story" : "stories"} in
            the pool.
          </p>
        )}
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

      {story.nextWatch?.trim() && (
        <section className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-6">
          <h2 className="font-serif text-xl text-white">What To Watch Next</h2>
          <p className="leading-relaxed text-zinc-300">{story.nextWatch}</p>
        </section>
      )}
    </div>
  );
}
