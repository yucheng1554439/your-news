import {
  briefingMetaColor,
  briefingSectionLabelColor,
} from "@/components/BriefingMemo";
import type { BriefingProvenance as Provenance } from "@/lib/briefing/types";

interface BriefingProvenanceProps {
  provenance: Provenance;
  className?: string;
}

export function BriefingProvenance({
  provenance,
  className = "",
}: BriefingProvenanceProps) {
  const stories =
    provenance.storiesProcessed ?? provenance.articleCount ?? 0;
  const narratives =
    provenance.narrativesProcessed ?? provenance.narrativeCount ?? 0;
  const sources =
    provenance.sourcesProcessed ?? provenance.sourceCount ?? 0;
  const signals = provenance.signalsProcessed ?? 0;

  if (stories === 0) return null;

  const sourceLine =
    provenance.sources.length > 0
      ? provenance.sources.slice(0, 8).join(" · ")
      : "Various outlets";

  return (
    <div
      className={`mt-4 space-y-2 border-t border-white/10 pt-4 text-xs ${className}`}
      style={{ color: briefingMetaColor }}
    >
      <p>
        <span style={{ color: briefingSectionLabelColor }}>
          Synthesis corpus ·{" "}
        </span>
        {stories} {stories === 1 ? "story" : "stories"}
        {narratives > 0 ? (
          <>
            {" "}
            · {narratives}{" "}
            {narratives === 1 ? "narrative" : "narratives"}
          </>
        ) : null}
        {sources > 0 ? (
          <>
            {" "}
            · {sources}{" "}
            {sources === 1 ? "source" : "sources"}
          </>
        ) : null}
        {signals > 0 ? (
          <>
            {" "}
            · {signals} {signals === 1 ? "signal" : "signals"}
          </>
        ) : null}
      </p>
      <p>
        <span style={{ color: briefingSectionLabelColor }}>
          Primary sources ·{" "}
        </span>
        {sourceLine}
        {provenance.sources.length > 8
          ? ` · +${provenance.sources.length - 8} more`
          : null}
      </p>
    </div>
  );
}
