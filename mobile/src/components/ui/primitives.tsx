import { Pressable, Text, View } from "react-native";

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        backgroundColor: "rgba(255,255,255,0.05)",
        padding: 3,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: active ? "rgba(255,255,255,0.15)" : "transparent",
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontSize: 13,
                fontWeight: active ? "600" : "400",
                color: active ? "#fff" : "#71717a",
                textTransform: "capitalize",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "600",
          color: "#fff",
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "#71717a",
      }}
    >
      {children}
    </Text>
  );
}

export function FeedErrorBanner({ message }: { message: string }) {
  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(248,113,113,0.3)",
        backgroundColor: "rgba(127,29,29,0.2)",
        padding: 14,
      }}
    >
      <Text style={{ color: "#fca5a5", fontSize: 14 }}>{message}</Text>
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#71717a" }}>Loading intelligence…</Text>
    </View>
  );
}
