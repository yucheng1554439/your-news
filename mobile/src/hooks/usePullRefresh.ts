import { useCallback, useState } from "react";
import { hapticRefresh } from "@/lib/haptics";

/** Only show RefreshControl spinner for user-initiated pull, not background refetch. */
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [pulling, setPulling] = useState(false);

  const onRefresh = useCallback(async () => {
    setPulling(true);
    void hapticRefresh();
    try {
      await refetch();
    } finally {
      setPulling(false);
    }
  }, [refetch]);

  return { refreshing: pulling, onRefresh };
}
