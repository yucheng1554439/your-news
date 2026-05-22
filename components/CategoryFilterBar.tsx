"use client";

import { motion } from "framer-motion";
import {
  TOP_STORY_CATEGORIES,
  type TopStoryCategory,
} from "@/lib/feed/category-filter";
import { cn } from "@/lib/utils";

interface CategoryFilterBarProps {
  value: TopStoryCategory;
  onChange: (category: TopStoryCategory) => void;
  className?: string;
}

export function CategoryFilterBar({
  value,
  onChange,
  className,
}: CategoryFilterBarProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      role="tablist"
      aria-label="Filter top stories by category"
    >
      {TOP_STORY_CATEGORIES.map((cat) => {
        const active = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(cat.id)}
            className={cn(
              "relative shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-white/25 bg-white/10 text-white"
                : "border-white/10 bg-transparent text-zinc-500 hover:border-white/15 hover:text-zinc-300"
            )}
          >
            {active && (
              <motion.span
                layoutId="category-filter-pill"
                className="absolute inset-0 rounded-full border border-white/20 bg-white/5"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
