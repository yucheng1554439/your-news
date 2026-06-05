import "react-native-gesture-handler";
import * as WebBrowser from "expo-web-browser";
import { ClerkProvider } from "@clerk/clerk-expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { getClerkPublishableKey } from "@/api/client";
import { SavedStoriesProvider } from "@/providers/SavedStoriesProvider";

WebBrowser.maybeCompleteAuthSession();

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={getClerkPublishableKey()}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <SavedStoriesProvider>
          <StatusBar style="light" />
          <Slot />
        </SavedStoriesProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
