export type PersonalizeFlow = "onboarding" | "settings";

const ONBOARDING = {
  interests: "/onboarding/interests",
  career: "/onboarding/career",
  focus: "/onboarding/preferences",
  tone: "/onboarding/preferences",
  backFromInterests: undefined,
  backFromCareer: "/onboarding/interests",
  backFromFocus: "/onboarding/career",
  backFromTone: "/onboarding/career",
  complete: "/",
} as const;

const SETTINGS = {
  interests: "/settings/personalize/interests",
  career: "/settings/personalize/career",
  focus: "/settings/personalize/focus",
  tone: "/settings/personalize/tone",
  backFromInterests: "/settings",
  backFromCareer: "/settings/personalize/interests",
  backFromFocus: "/settings/personalize/career",
  backFromTone: "/settings/personalize/focus",
  complete: "/",
} as const;

export function getPersonalizeRoutes(flow: PersonalizeFlow) {
  return flow === "settings" ? SETTINGS : ONBOARDING;
}

export const SETTINGS_PERSONALIZE_STEPS = 4;
