import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";

/** Preloads the browser for faster Clerk OAuth on iOS. */
export function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}
