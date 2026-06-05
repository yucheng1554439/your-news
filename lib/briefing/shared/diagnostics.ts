const DEV_DIAGNOSTIC =
  /(?:weekly|daily):\s*no stories selected|briefing prompt blocked|insufficient source text for briefing/i;

export function isDeveloperBriefingDiagnostic(text?: string | null): boolean {
  if (!text?.trim()) return false;
  return DEV_DIAGNOSTIC.test(text);
}

/** Strip internal diagnostics before persisting or returning to the client. */
export function stripBriefingDiagnostics<
  T extends { aiError?: string; openaiError?: string },
>(briefing: T): T {
  const aiError = briefing.aiError;
  const openaiError = briefing.openaiError;
  if (
    !isDeveloperBriefingDiagnostic(aiError) &&
    !isDeveloperBriefingDiagnostic(openaiError)
  ) {
    return briefing;
  }
  return {
    ...briefing,
    aiError: isDeveloperBriefingDiagnostic(aiError) ? undefined : aiError,
    openaiError: isDeveloperBriefingDiagnostic(openaiError)
      ? undefined
      : openaiError,
  };
}
