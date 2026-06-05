import { useSignIn } from "@clerk/clerk-expo";
import { Link } from "expo-router";
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
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        setError("Additional verification required");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authScreenStyle}>
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "600" }}>
        Your News
      </Text>
      <Text style={{ color: "#71717a", fontSize: 14 }}>
        Strategic intelligence, personalized for you.
      </Text>

      <GoogleSignInButton />

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
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        style={authInputStyle}
      />
      {error && <Text style={{ color: "#f87171" }}>{error}</Text>}
      <Pressable
        onPress={() => void onSignIn()}
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
            Sign in with email
          </Text>
        )}
      </Pressable>
      <Link href="/(auth)/sign-up">
        <Text style={{ color: "#71717a", textAlign: "center" }}>
          Create account
        </Text>
      </Link>
    </View>
  );
}
