import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { refreshIntelligence } from "@/api/endpoints";
import { hapticRefresh } from "@/lib/haptics";

export type IntelligenceRefreshStatus =
  | "idle"
  | "refreshing"
  | "success"
  | "error";

export function useRefreshIntelligence() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<IntelligenceRefreshStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return refreshIntelligence(token);
    },
    onMutate: () => {
      setStatus("refreshing");
      setStatusMessage("Refreshing intelligence...");
    },
    onSuccess: async (data) => {
      if (!data.ok) {
        setStatus("error");
        setStatusMessage(data.error ?? "Refresh failed");
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["signals"] }),
        queryClient.invalidateQueries({ queryKey: ["profileIntelligence"] }),
      ]);

      await queryClient.refetchQueries({ queryKey: ["dashboard"] });
      await queryClient.refetchQueries({ queryKey: ["signals"] });
      await queryClient.refetchQueries({ queryKey: ["profileIntelligence"] });

      setStatus("success");
      setStatusMessage("Intelligence updated");
      void hapticRefresh();
    },
    onError: (err: Error) => {
      setStatus("error");
      setStatusMessage(err.message || "Refresh failed");
    },
  });

  const refresh = useCallback(() => {
    if (mutation.isPending) return;
    mutation.mutate();
  }, [mutation]);

  const clearStatus = useCallback(() => {
    setStatus("idle");
    setStatusMessage(null);
  }, []);

  return {
    refresh,
    isRefreshing: mutation.isPending,
    status,
    statusMessage,
    lastResult: mutation.data,
    clearStatus,
  };
}
