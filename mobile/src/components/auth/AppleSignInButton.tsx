import { useOAuth } from "@clerk/clerk-expo";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";
import { oauthRedirectUrl } from "@/lib/oauth-redirect";

/**
 * Sign in with Apple — required on iOS when Google OAuth is offered (App Store Guideline 4.8).
 */
export function AppleSignInButton() {
  useWarmUpBrowser();
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

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
      setError(err instanceof Error ? err.message : "Apple sign-in failed");
    } finally {
      setLoading(false);
    }
  }, [router, startOAuthFlow]);

  if (Platform.OS !== "ios" || !available) {
    return null;
  }

  return (
    <View style={{ gap: 8 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={999}
        style={{ width: "100%", height: 52 }}
        onPress={() => void onPress()}
        disabled={loading}
      />
      {error ? (
        <Text style={{ color: "#f87171", textAlign: "center", fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
