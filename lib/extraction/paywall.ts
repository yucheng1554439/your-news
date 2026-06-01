const MIN_USEFUL_BODY_CHARS = 280;

const PAYWALL_MARKERS = [
  /subscribe (now )?to (continue|read|keep reading)/i,
  /already a subscriber/i,
  /sign in to continue reading/i,
  /log in to continue reading/i,
  /this (story|article|content) is (for|available to) subscribers/i,
  /subscriber(-|\s)?only/i,
  /unlock this (article|story|content)/i,
  /register for free to (read|continue)/i,
  /create a free account to continue/i,
  /to keep reading, subscribe/i,
  /purchase a subscription/i,
  /exclusive subscriber/i,
  /members only/i,
  /you['']ve reached your (free )?article limit/i,
  /start your (free )?trial/i,
  /please subscribe to read/i,
  /become a subscriber/i,
];

function isPaywallBoilerplateLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    /^subscribe\b/.test(lower) ||
    /^sign in\b/.test(lower) ||
    /^sign up\b/.test(lower) ||
    /^register\b/.test(lower) ||
    /^unlock\b/.test(lower) ||
    /\bsubscriber(-|\s)?only\b/.test(lower) ||
    /^already a member/.test(lower) ||
    /^to continue reading/.test(lower)
  );
}

function substantiveBodyLength(text: string): number {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 25 && !isPaywallBoilerplateLine(line))
    .join(" ").length;
}

function countPaywallMarkers(text: string): number {
  let hits = 0;
  for (const pattern of PAYWALL_MARKERS) {
    if (pattern.test(text)) hits += 1;
  }
  return hits;
}

/** True when extracted text is mostly paywall / subscription boilerplate. */
export function isPaywallContent(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 60) return false;

  const substantive = substantiveBodyLength(trimmed);
  const markerHits = countPaywallMarkers(trimmed);

  if (substantive >= MIN_USEFUL_BODY_CHARS * 2) {
    if (markerHits === 0) return false;
    if (markerHits === 1 && substantive >= MIN_USEFUL_BODY_CHARS * 3) {
      return false;
    }
    const lines = trimmed
      .split("\n")
      .filter((line) => line.trim().length > 20);
    const boilerplateLines = lines.filter((line) =>
      isPaywallBoilerplateLine(line)
    ).length;
    if (boilerplateLines / Math.max(lines.length, 1) < 0.2) return false;
  }

  if (markerHits >= 2) return true;
  if (markerHits >= 1 && trimmed.length < 420) return true;

  const lower = trimmed.toLowerCase();
  const subscribeCount = (lower.match(/\bsubscribe\b/g) ?? []).length;
  const signInCount = (lower.match(/\bsign in\b/g) ?? []).length;

  if (subscribeCount >= 2 && substantive < MIN_USEFUL_BODY_CHARS) return true;
  if (
    (subscribeCount >= 1 || signInCount >= 1) &&
    substantive < 240 &&
    trimmed.length < 360
  ) {
    return true;
  }

  const lines = trimmed.split("\n").filter((line) => line.trim().length > 20);
  if (lines.length === 0) return markerHits >= 1;

  const boilerplateLines = lines.filter((line) =>
    isPaywallBoilerplateLine(line)
  ).length;
  if (
    boilerplateLines / lines.length > 0.45 &&
    substantive < MIN_USEFUL_BODY_CHARS &&
    markerHits >= 1
  ) {
    return true;
  }

  return false;
}

export const PAYWALL_SIGNAL_DISCLAIMER =
  "Generated from metadata and corroborating coverage. Full article unavailable.";

export const METADATA_SIGNAL_DISCLAIMER =
  "Generated from metadata and corroborating coverage.";
