import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSavedStories, toggleSavedStory } from "@/api/endpoints";
import { getSavedSnapshotBySlug, storyToSavedSnapshot } from "@/lib/saved-snapshot";
import type { Story } from "@/types";
import type { SavedStorySnapshot } from "@/types/saved";

const SAVED_STALE_MS = 5 * 60 * 1000;

type SavedStoriesContextValue = {
  /** Undefined until the first fetch completes. */
  items: SavedStorySnapshot[] | undefined;
  /** True only on the very first load (no cached data yet). */
  isInitialLoading: boolean;
  isSaved: (slug: string) => boolean;
  getSnapshot: (slug: string) => SavedStorySnapshot | undefined;
  toggle: (story: Story) => Promise<{ ok: boolean; saved?: boolean; error?: string }>;
  refresh: () => Promise<void>;
};

const SavedStoriesContext = createContext<SavedStoriesContextValue | null>(null);

export function SavedStoriesProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["savedStories"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetchSavedStories(token);
      return res.items;
    },
    enabled: isSignedIn ?? false,
    staleTime: SAVED_STALE_MS,
    gcTime: SAVED_STALE_MS * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const mutation = useMutation({
    mutationFn: async (story: Story) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return toggleSavedStory(token, story);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["savedStories"], data.items);
    },
  });

  const isSaved = useCallback(
    (slug: string) => (query.data ?? []).some((item) => item.slug === slug),
    [query.data]
  );

  const getSnapshot = useCallback(
    (slug: string) => getSavedSnapshotBySlug(query.data, slug),
    [query.data]
  );

  const toggle = useCallback(
    async (story: Story) => {
      const wasSaved = isSaved(story.slug);
      const previous = query.data ?? [];

      queryClient.setQueryData<SavedStorySnapshot[]>(
        ["savedStories"],
        wasSaved
          ? previous.filter((i) => i.slug !== story.slug)
          : [storyToSavedSnapshot(story), ...previous]
      );

      try {
        const result = await mutation.mutateAsync(story);
        return { ok: true, saved: result.saved };
      } catch (err) {
        queryClient.setQueryData(["savedStories"], previous);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Could not save story",
        };
      }
    },
    [isSaved, mutation, query.data, queryClient]
  );

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const value = useMemo(
    () => ({
      items: query.data,
      isInitialLoading: query.isPending && query.data === undefined,
      isSaved,
      getSnapshot,
      toggle,
      refresh,
    }),
    [query.data, query.isPending, isSaved, getSnapshot, toggle, refresh]
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
