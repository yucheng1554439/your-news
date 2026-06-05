import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { fetchProfileIntelligence } from "@/api/endpoints";

export function useProfileIntelligence() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["profileIntelligence"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return fetchProfileIntelligence(token);
    },
    enabled: isSignedIn ?? false,
    staleTime: 120_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
