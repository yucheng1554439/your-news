import type { BriefingProvenance as Provenance } from "@/lib/briefing/types";

interface BriefingProvenanceProps {
  provenance: Provenance;
  className?: string;
}

export function BriefingProvenance({
  provenance,
  className = "",
}: BriefingProvenanceProps) {
  if (provenance.articleCount === 0) return null;

  const sourceLine =
    provenance.sources.length > 0
      ? provenance.sources.slice(0, 8).join(" · ")
      : "Various outlets";

  return (
    <div
      className={`mt-4 space-y-2 border-t border-white/10 pt-4 text-xs text-zinc-500 ${className}`}
    >
      <p>
        <span className="text-zinc-600">Primary sources · </span>
        {sourceLine}
        {provenance.sources.length > 8
          ? ` · +${provenance.sources.length - 8} more`
          : null}
      </p>
      <p>
        <span className="text-zinc-600">Built from · </span>
        {provenance.articleCount}{" "}
        {provenance.articleCount === 1 ? "article" : "articles"}
        {provenance.narrativeCount > 0 ? (
          <>
            {" "}
            · {provenance.narrativeCount}{" "}
            {provenance.narrativeCount === 1 ? "narrative" : "narratives"}
          </>
        ) : null}{" "}
        · {provenance.sourceCount}{" "}
        {provenance.sourceCount === 1 ? "organization" : "organizations"}
      </p>
    </div>
  );
}
