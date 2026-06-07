import { apiFetch } from "@/api/client";
import type { DashboardPayload } from "@/types";
import type { IntelligenceRefreshPayload } from "@/types/intelligence-refresh";
import type { ProfileIntelligencePayload, SignalsPayload } from "@/types/intelligence";
import type { SavedStorySnapshot } from "@/types/saved";
import type { Story } from "@/types";

export type TopicPreferences = {
  moreOf: string[];
  lessOf: string[];
  neverShow: string[];
};

export async function fetchDashboard(token: string) {
  return apiFetch<DashboardPayload>("/dashboard", { token });
}

export async function fetchTopicPreferences(token: string) {
  return apiFetch<{ ok: true; topicPreferences: TopicPreferences }>(
    "/profile/topics",
    { token }
  );
}

export async function saveTopicPreferences(
  token: string,
  topicPreferences: TopicPreferences
) {
  return apiFetch<{ ok: true; topicPreferences: TopicPreferences }>(
    "/profile/topics",
    {
      method: "PUT",
      token,
      body: JSON.stringify({ topicPreferences }),
    }
  );
}

export async function fetchHealth() {
  return apiFetch<{ ok: true; version: string; service: string }>("/health");
}

export async function fetchSavedStories(token: string) {
  return apiFetch<{ ok: true; items: SavedStorySnapshot[] }>("/profile/saved", {
    token,
  });
}

export async function toggleSavedStory(token: string, story: Story) {
  return apiFetch<{
    ok: true;
    saved: boolean;
    items: SavedStorySnapshot[];
  }>("/profile/saved", {
    method: "POST",
    token,
    body: JSON.stringify({ story }),
  });
}

export async function fetchProfileIntelligence(token: string) {
  return apiFetch<ProfileIntelligencePayload>("/profile/intelligence", {
    token,
  });
}

export async function fetchSignals(token: string) {
  return apiFetch<SignalsPayload>("/signals", { token });
}

/** Permanently delete account — Apple Guideline 5.1.1(v). */
export async function deleteAccount(token: string) {
  return apiFetch<{ ok: true; deleted: true }>("/profile/account", {
    method: "DELETE",
    token,
  });
}

/** Regenerates briefings, signals inputs, rankings, and story ingestion (same as web). */
export async function refreshIntelligence(token: string) {
  return apiFetch<IntelligenceRefreshPayload>("/intelligence/refresh", {
    method: "POST",
    token,
  });
}
