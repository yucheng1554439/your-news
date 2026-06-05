import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { fetchDashboard } from "@/api/endpoints";
import type { DashboardPayload } from "@/types";

/** Dashboard stays stable while reading; refetch only when stale or explicit. */
export const DASHBOARD_STALE_MS = 5 * 60 * 1000;

export function useDashboard() {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardPayload> => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return fetchDashboard(token);
    },
    enabled: isSignedIn ?? false,
    staleTime: DASHBOARD_STALE_MS,
    gcTime: DASHBOARD_STALE_MS * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const wasBackground =
        appState.current === "background" || appState.current === "inactive";
      appState.current = next;

      if (wasBackground && next === "active") {
        const state = queryClient.getQueryState<DashboardPayload>(["dashboard"]);
        const fetchedAt = state?.dataUpdatedAt ?? 0;
        if (Date.now() - fetchedAt > DASHBOARD_STALE_MS) {
          void query.refetch();
        }
      }
    });
    return () => sub.remove();
  }, [query, queryClient]);

  return query;
}

/** Call after login or explicit intelligence refresh. */
export function invalidateDashboard(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}
