"use client";

const SECTION_HEADERS = new Set([
  "What Changed",
  "Why It Matters To You",
  "Why It Matters",
  "What To Watch",
  "Action / Positioning",
  "Would Change If",
]);

export function BriefingMemo({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);

  return (
    <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-zinc-300 sm:text-[15px] sm:leading-6">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0]?.trim() ?? "";
        const isSection = SECTION_HEADERS.has(first);
        const body = isSection ? lines.slice(1).join("\n").trim() : block.trim();

        if (isSection) {
          return (
            <div key={i}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                {first}
              </p>
              <p className="whitespace-pre-line text-zinc-300">{body}</p>
            </div>
          );
        }

        return (
          <p key={i} className="whitespace-pre-line">
            {block.trim()}
          </p>
        );
      })}
    </div>
  );
}
