import { Linking, Pressable, Text, View } from "react-native";
import {
  privacyPolicyUrl,
  supportUrl,
  termsOfServiceUrl,
} from "@/lib/legal-urls";

type AuthLegalFooterProps = {
  mode?: "sign-in" | "sign-up";
};

export function AuthLegalFooter({ mode = "sign-in" }: AuthLegalFooterProps) {
  const verb = mode === "sign-up" ? "creating an account" : "signing in";

  return (
    <Text
      style={{
        color: "#71717a",
        fontSize: 12,
        textAlign: "center",
        lineHeight: 18,
        marginTop: 8,
      }}
    >
      By {verb}, you agree to our{" "}
      <Text
        style={{ color: "#a1a1aa", textDecorationLine: "underline" }}
        onPress={() => void Linking.openURL(termsOfServiceUrl())}
      >
        Terms of Service
      </Text>{" "}
      and{" "}
      <Text
        style={{ color: "#a1a1aa", textDecorationLine: "underline" }}
        onPress={() => void Linking.openURL(privacyPolicyUrl())}
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

export function LegalLinksSection() {
  const links = [
    { label: "Privacy Policy", url: privacyPolicyUrl() },
    { label: "Terms of Service", url: termsOfServiceUrl() },
    { label: "Support", url: supportUrl() },
  ];

  return (
    <View style={{ gap: 8 }}>
      {links.map((link) => (
        <Pressable
          key={link.label}
          onPress={() => void Linking.openURL(link.url)}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            paddingVertical: 4,
          })}
        >
          <Text style={{ color: "#a1a1aa", fontSize: 15 }}>{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
