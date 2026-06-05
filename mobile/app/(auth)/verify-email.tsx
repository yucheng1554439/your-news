import { useSignUp } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { authInputStyle, authScreenStyle } from "@/components/auth/auth-ui";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (isLoaded && !signUp?.id) {
      router.replace("/(auth)/sign-up");
    }
  }, [isLoaded, signUp?.id, router]);

  const onVerify = async () => {
    if (!isLoaded || !signUp) return;
    const trimmed = code.trim();
    if (trimmed.length < 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: trimmed,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(app)");
        return;
      }

      setError("Verification incomplete. Check the code and try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!isLoaded || !signUp) return;
    setResending(true);
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  const displayEmail =
    typeof email === "string" && email.length > 0
      ? email
      : signUp?.emailAddress ?? "your email";

  return (
    <View style={authScreenStyle}>
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "600" }}>
        Verify your email
      </Text>
      <Text style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 20 }}>
        Enter the 6-digit code sent to{" "}
        <Text style={{ color: "#e4e4e7" }}>{displayEmail}</Text>
      </Text>

      <TextInput
        placeholder="123456"
        placeholderTextColor="#71717a"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
        style={{
          ...authInputStyle,
          fontSize: 24,
          letterSpacing: 8,
          textAlign: "center",
        }}
      />

      {error && <Text style={{ color: "#f87171" }}>{error}</Text>}

      <Pressable
        onPress={() => void onVerify()}
        disabled={loading || code.length < 6}
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 999,
          opacity: loading || code.length < 6 ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={{ color: "#000", textAlign: "center", fontWeight: "600" }}>
            Verify and continue
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => void onResend()} disabled={resending}>
        <Text style={{ color: "#71717a", textAlign: "center" }}>
          {resending ? "Sending…" : "Resend code"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.replace("/(auth)/sign-up")}>
        <Text style={{ color: "#52525b", textAlign: "center", fontSize: 13 }}>
          Use a different email
        </Text>
      </Pressable>
    </View>
  );
}
