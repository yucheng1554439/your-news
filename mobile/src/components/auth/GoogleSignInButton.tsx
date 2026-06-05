import { useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";
import { oauthRedirectUrl } from "@/lib/oauth-redirect";

type GoogleSignInButtonProps = {
  label?: string;
};

export function GoogleSignInButton({
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  useWarmUpBrowser();
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: oauthRedirectUrl(),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(app)");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }, [router, startOAuthFlow]);

  return (
    <>
      <Pressable
        onPress={() => void onPress()}
        disabled={loading}
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 999,
          opacity: loading ? 0.7 : 1,
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{ color: "#000", fontWeight: "600", fontSize: 16 }}>
            {label}
          </Text>
        )}
      </Pressable>
      {error ? (
        <Text style={{ color: "#f87171", textAlign: "center", fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
    </>
  );
}
