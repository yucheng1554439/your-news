import * as Linking from "expo-linking";

/** Redirect URL for Clerk OAuth — add this in Clerk Dashboard → Redirect URLs. */
export function oauthRedirectUrl(): string {
  return Linking.createURL("/", { scheme: "yournews" });
}
