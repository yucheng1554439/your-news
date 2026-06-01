import "server-only";

import type { WeeklyBriefingSelection } from "@/lib/briefing/weekly-selection";
import {
  countSourceMaterial,
  storyHasUsableMaterial,
  storySourceText,
} from "@/lib/briefing/source-material";
import type { BriefingMode } from "@/lib/briefing/types";
import type { Story } from "@/lib/types";

export type DailyPipelineAudit = {
  selectedStories: number;
  storyIds: string[];
  headlineCount: number;
  sourceCount: number;
  articleBodyCount: number;
  clusterCount: number;
  totalMaterialChars: number;
  usableStoryCount: number;
  readyForModel: boolean;
};

export function auditDailyPipeline(
  selection: WeeklyBriefingSelection,
  stories: Story[],
  mode: BriefingMode
): DailyPipelineAudit {
  const material = countSourceMaterial(stories);
  const sources = new Set(stories.map((s) => s.source));

  const audit: DailyPipelineAudit = {
    selectedStories: stories.length,
    storyIds: stories.map((s) => s.slug),
    headlineCount: stories.filter((s) => s.headline?.trim()).length,
    sourceCount: sources.size,
    articleBodyCount: material.articleBodyCount,
    clusterCount: selection.threads.length,
    totalMaterialChars: material.totalMaterialChars,
    usableStoryCount: material.usableStoryCount,
    readyForModel:
      stories.length > 0 &&
      material.usableStoryCount > 0 &&
      material.totalMaterialChars >= 160,
  };

  console.log(
    `[DAILY] pre-call · ${mode} — selectedStories=${audit.selectedStories} storyIds=[${audit.storyIds.join(", ")}] headlines=${audit.headlineCount} sources=${audit.sourceCount} articleBodies=${audit.articleBodyCount} clusters=${audit.clusterCount} materialChars=${audit.totalMaterialChars} usable=${audit.usableStoryCount} ready=${audit.readyForModel}`
  );

  for (const story of stories) {
    const len = storySourceText(story).length;
    console.log(
      `[DAILY] story · ${story.slug} — material=${len} chars bodySource=${story.articleBodySource ?? "none"} usable=${storyHasUsableMaterial(story)}`
    );
  }

  if (!audit.readyForModel) {
    console.warn(
      `[DAILY] insufficient material for Claude · ${mode} — will skip AI and use fallback`
    );
  }

  return audit;
}
