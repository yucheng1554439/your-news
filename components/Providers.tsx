"use client";

import { SavedStoriesProvider } from "@/components/SavedStoriesProvider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SavedStoriesProvider>{children}</SavedStoriesProvider>;
}
