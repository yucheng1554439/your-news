import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { fetchSignals } from "@/api/endpoints";

export function useSignals() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["signals"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return fetchSignals(token);
    },
    enabled: isSignedIn ?? false,
    staleTime: 120_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
