import type { Story } from "@/lib/types";

function leadFact(story: Story): string {
  const raw =
    story.articleBody ?? story.rawExcerpt ?? story.summary ?? story.headline;
  const sentence = raw.split(/[.!?]/)[0]?.trim();
  return sentence || story.headline;
}

/** One-line takeaway for the weekly hero — fact-led, not category theater. */
export function deriveKeySignal(stories: Story[]): string {
  if (stories.length === 0) return "";

  const lead = stories[0];
  const fact = leadFact(lead);

  const second = stories[1];
  if (second) {
    const secondFact = leadFact(second);
    return `${fact} — also in play: ${secondFact.slice(0, 120)}`;
  }

  return fact.slice(0, 200);
}
