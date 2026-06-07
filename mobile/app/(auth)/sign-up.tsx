import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AuthDivider,
  authInputStyle,
  authScreenStyle,
} from "@/components/auth/auth-ui";
import { AppleSignInButton } from "@/components/auth/AppleSignInButton";
import { AuthLegalFooter } from "@/components/auth/AuthLegalFooter";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignUp = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(app)");
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim() },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authScreenStyle}>
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "600" }}>
        Create account
      </Text>

      <AppleSignInButton />

      <GoogleSignInButton label="Sign up with Google" />

      <AuthDivider />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#71717a"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        style={authInputStyle}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#71717a"
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        style={authInputStyle}
      />
      {error && <Text style={{ color: "#f87171" }}>{error}</Text>}
      <Pressable
        onPress={() => void onSignUp()}
        disabled={loading}
        style={{
          backgroundColor: "#27272a",
          padding: 16,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#3f3f46",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
            Sign up with email
          </Text>
        )}
      </Pressable>
      <Link href="/(auth)/sign-in">
        <Text style={{ color: "#71717a", textAlign: "center" }}>
          Already have an account?
        </Text>
      </Link>
      <AuthLegalFooter mode="sign-up" />
    </View>
  );
}
