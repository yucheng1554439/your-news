import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#09090b" },
        headerTintColor: "#fff",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#09090b" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="story/[slug]"
        options={{ title: "", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="signal/[id]"
        options={{ title: "Signal", headerBackTitle: "Signals" }}
      />
      <Stack.Screen
        name="settings/topics"
        options={{ title: "Topic preferences" }}
      />
      <Stack.Screen
        name="settings/intelligence"
        options={{ title: "Intelligence Profile" }}
      />
    </Stack>
  );
}
