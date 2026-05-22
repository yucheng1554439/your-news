"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingCardProps {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}

export function OnboardingCard({
  label,
  description,
  icon: Icon,
  selected,
  onSelect,
}: OnboardingCardProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col items-start gap-3 rounded-xl border p-5 text-left transition-colors",
        selected
          ? "border-white/20 bg-zinc-800/80"
          : "border-white/10 bg-zinc-900/50 hover:border-white/15 hover:bg-zinc-900"
      )}
    >
      <div
        className={cn(
          "rounded-lg border p-2.5",
          selected ? "border-white/20 bg-white/5" : "border-white/10"
        )}
      >
        <Icon
          className={cn("h-5 w-5", selected ? "text-white" : "text-zinc-400")}
        />
      </div>
      <div>
        <span className="font-medium text-white">{label}</span>
        {description && (
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        )}
      </div>
    </motion.button>
  );
}
