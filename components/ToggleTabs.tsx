"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type FeedMode = "personalized" | "global";

interface ToggleTabsProps {
  value: FeedMode;
  onChange: (value: FeedMode) => void;
  className?: string;
}

const tabs: { value: FeedMode; label: string }[] = [
  { value: "personalized", label: "For You" },
  { value: "global", label: "Global" },
];

export function ToggleTabs({ value, onChange, className }: ToggleTabsProps) {
  return (
    <div
      className={cn(
        "relative inline-flex rounded-full border border-white/10 bg-zinc-900/80 p-1",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative z-10 rounded-full px-4 py-1.5 text-sm transition-colors",
              isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="feed-toggle"
                className="absolute inset-0 rounded-full bg-zinc-800"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
