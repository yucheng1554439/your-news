import "server-only";

import type { BriefingCadence, BriefingMode } from "@/lib/briefing/types";

export type ParseSectionStatus = {
  title: boolean;
  whatChanged: boolean;
  whyYou: boolean;
  whyItMatters: boolean;
  watch: boolean;
  action: boolean;
  invalidate: boolean;
};

export function emptyParseSectionStatus(): ParseSectionStatus {
  return {
    title: false,
    whatChanged: false,
    whyYou: false,
    whyItMatters: false,
    watch: false,
    action: false,
    invalidate: false,
  };
}

function yn(found: boolean): string {
  return found ? "yes" : "no";
}

export function logParseSections(
  label: string,
  status: ParseSectionStatus,
  extra?: string
): void {
  const detail = extra ? ` — ${extra}` : "";
  console.log(
    `[PARSE] ${label} — title=${yn(status.title)} what_changed=${yn(status.whatChanged)} why_you=${yn(status.whyYou)} why_it_matters=${yn(status.whyItMatters)} action=${yn(status.action)} watch=${yn(status.watch)} invalidate=${yn(status.invalidate)}${detail}`
  );
}

export function logParseFailure(input: {
  label: string;
  cadence?: BriefingCadence;
  mode?: BriefingMode;
  rawLength: number;
  foundTags: string[];
  missingTags: string[];
  status: ParseSectionStatus;
  reason: string;
  rawPreview?: string;
}): void {
  const scope =
    input.cadence && input.mode ? ` · ${input.cadence}/${input.mode}` : "";
  console.warn(
    `[PARSE] FAILED ${input.label}${scope} — ${input.reason} — raw_len=${input.rawLength} missing=[${input.missingTags.join(", ")}] found=[${input.foundTags.join(", ")}]`
  );
  console.warn(
    `[PARSE] sections — title=${yn(input.status.title)} what_changed=${yn(input.status.whatChanged)} why_it_matters=${yn(input.status.whyItMatters)} action=${yn(input.status.action)} watch=${yn(input.status.watch)}`
  );
  if (input.rawPreview) {
    console.warn(`[PARSE] preview — ${input.rawPreview.slice(0, 400)}`);
  }
}

export function logParseRecovered(
  label: string,
  status: ParseSectionStatus,
  filled: string[]
): void {
  console.log(
    `[PARSE] RECOVERED ${label} — filled=[${filled.join(", ")}] title=${yn(status.title)} what_changed=${yn(status.whatChanged)}`
  );
}
