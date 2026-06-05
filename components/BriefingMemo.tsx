"use client";

import {
  INTELLIGENCE_BODY_COLOR,
  INTELLIGENCE_SECTION_LABEL_COLOR,
} from "@/lib/briefing/shared/typography";

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
    <div
      className="max-w-2xl space-y-4 text-sm leading-relaxed sm:text-[15px] sm:leading-6"
      style={{ color: INTELLIGENCE_BODY_COLOR }}
    >
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0]?.trim() ?? "";
        const isSection = SECTION_HEADERS.has(first);
        const body = isSection ? lines.slice(1).join("\n").trim() : block.trim();

        if (isSection) {
          return (
            <div key={i}>
              <p
                className="mb-1 text-xs font-medium uppercase tracking-wider"
                style={{ color: INTELLIGENCE_SECTION_LABEL_COLOR }}
              >
                {first}
              </p>
              <p
                className="whitespace-pre-line"
                style={{ color: INTELLIGENCE_BODY_COLOR }}
              >
                {body}
              </p>
            </div>
          );
        }

        return (
          <p
            key={i}
            className="whitespace-pre-line"
            style={{ color: INTELLIGENCE_BODY_COLOR }}
          >
            {block.trim()}
          </p>
        );
      })}
    </div>
  );
}

export {
  INTELLIGENCE_BODY_COLOR as briefingBodyColor,
  INTELLIGENCE_META_COLOR as briefingMetaColor,
  INTELLIGENCE_SECTION_LABEL_COLOR as briefingSectionLabelColor,
  INTELLIGENCE_TITLE_COLOR as briefingTitleColor,
} from "@/lib/briefing/shared/typography";

/** @deprecated Use named exports briefingBodyColor, etc. */
export const briefingTypography = {
  body: INTELLIGENCE_BODY_COLOR,
  meta: "rgba(255,255,255,0.55)",
  sectionLabel: INTELLIGENCE_SECTION_LABEL_COLOR,
  title: "#FFFFFF",
};
