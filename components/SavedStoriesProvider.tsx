"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import {
  getSavedStoriesFromClerk,
  toggleSavedStory,
} from "@/app/actions/saved-stories";
import type { SavedStoryRef } from "@/lib/saved-stories/metadata";
import { storyToSavedSnapshot } from "@/lib/saved-stories/metadata";
import type { Story } from "@/lib/types";

type SavedStoriesContextValue = {
  items: SavedStoryRef[];
  synced: boolean;
  isSaved: (slug: string) => boolean;
  toggle: (story: Story) => Promise<{ ok: boolean; saved?: boolean; error?: string }>;
  refresh: () => Promise<void>;
  isAuthenticated: boolean;
};

const SavedStoriesContext = createContext<SavedStoriesContextValue | null>(
  null
);

export function SavedStoriesProvider({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const [items, setItems] = useState<SavedStoryRef[]>([]);
  const [synced, setSynced] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setSynced(true);
      return;
    }
    const saved = await getSavedStoriesFromClerk();
    setItems(saved);
    setSynced(true);
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    void refresh();
  }, [isLoaded, refresh]);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isLoaded, user?.id, refresh]);

  const isSaved = useCallback(
    (slug: string) => items.some((item) => item.slug === slug),
    [items]
  );

  const toggle = useCallback(
    async (story: Story) => {
      if (!user?.id) {
        return { ok: false, error: "Sign in to save" };
      }

      const wasSaved = isSaved(story.slug);
      const previous = items;
      const optimistic = wasSaved
        ? items.filter((i) => i.slug !== story.slug)
        : [storyToSavedSnapshot(story), ...items];

      setItems(optimistic);

      const result = await toggleSavedStory(story);
      if (result.ok) {
        setItems(result.items);
        return { ok: true, saved: result.saved };
      }

      setItems(previous);
      return { ok: false, error: result.error };
    },
    [user?.id, isSaved, items]
  );

  const value = useMemo(
    () => ({
      items,
      synced,
      isSaved,
      toggle,
      refresh,
      isAuthenticated: Boolean(user?.id),
    }),
    [items, synced, isSaved, toggle, refresh, user?.id]
  );

  return (
    <SavedStoriesContext.Provider value={value}>
      {children}
    </SavedStoriesContext.Provider>
  );
}

export function useSavedStories(): SavedStoriesContextValue {
  const ctx = useContext(SavedStoriesContext);
  if (!ctx) {
    throw new Error("useSavedStories must be used within SavedStoriesProvider");
  }
  return ctx;
}
