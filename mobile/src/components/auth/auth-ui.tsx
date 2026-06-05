import { Text, View } from "react-native";

export function AuthDivider() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginVertical: 4,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: "#27272a" }} />
      <Text style={{ color: "#71717a", fontSize: 12 }}>or use email</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: "#27272a" }} />
    </View>
  );
}

export const authInputStyle = {
  backgroundColor: "#18181b",
  color: "#fff",
  padding: 14,
  borderRadius: 10,
} as const;

export const authScreenStyle = {
  flex: 1,
  backgroundColor: "#09090b",
  padding: 24,
  justifyContent: "center" as const,
  gap: 16,
};
