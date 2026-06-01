import {
  Brain,
  Code,
  Cpu,
  FlaskConical,
  Globe,
  LineChart,
  Rocket,
  Scale,
  Shield,
  Trophy,
  Tv,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type TopicPreferenceId =
  | "ai"
  | "markets"
  | "energy"
  | "geopolitics"
  | "cybersecurity"
  | "startups"
  | "policy"
  | "developer"
  | "sports"
  | "science"
  | "entertainment"
  | "technology";

export type TopicOption = {
  id: TopicPreferenceId;
  label: string;
  icon: LucideIcon;
};

export const TOPIC_PREFERENCE_OPTIONS: TopicOption[] = [
  { id: "ai", label: "AI & Machine Learning", icon: Brain },
  { id: "markets", label: "Markets & Finance", icon: LineChart },
  { id: "energy", label: "Energy & Climate", icon: Zap },
  { id: "geopolitics", label: "Geopolitics", icon: Globe },
  { id: "cybersecurity", label: "Cybersecurity", icon: Shield },
  { id: "startups", label: "Startups & Venture", icon: Rocket },
  { id: "policy", label: "Policy & Regulation", icon: Scale },
  { id: "developer", label: "Developer Tools", icon: Code },
  { id: "technology", label: "Technology", icon: Cpu },
  { id: "science", label: "Science & Health", icon: FlaskConical },
  { id: "sports", label: "Sports", icon: Trophy },
  { id: "entertainment", label: "Entertainment & Culture", icon: Tv },
];

export function topicPreferenceLabel(id: string): string {
  return (
    TOPIC_PREFERENCE_OPTIONS.find((option) => option.id === id)?.label ??
    id
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}
