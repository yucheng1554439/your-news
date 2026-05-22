import { ExternalLink } from "lucide-react";
import { getSourceHostname } from "@/lib/source-url";

interface ReadOriginalSourceProps {
  sourceUrl?: string;
  sourceName: string;
}

export function ReadOriginalSource({
  sourceUrl,
  sourceName,
}: ReadOriginalSourceProps) {
  if (!sourceUrl) return null;

  const domain = getSourceHostname(sourceUrl);
  const label = domain ?? sourceName;

  return (
    <section className="mt-12 rounded-xl border border-white/10 bg-zinc-900/40 p-6">
      <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
        Original reporting
      </p>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 font-serif text-lg text-white transition-colors hover:text-zinc-200"
      >
        Read Original Article
        <span aria-hidden>→</span>
        <span className="text-base font-sans text-zinc-400">{label}</span>
        <ExternalLink className="h-4 w-4 text-zinc-500" aria-hidden />
      </a>
    </section>
  );
}
