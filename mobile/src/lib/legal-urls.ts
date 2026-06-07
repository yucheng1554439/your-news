/**
 * Base URL for hosted legal pages (web app).
 * Set EXPO_PUBLIC_LEGAL_BASE_URL to production origin, e.g. https://yournews.app
 */
export function getLegalBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_LEGAL_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const api = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (api) {
    return api.replace(/\/api\/v1\/?$/i, "");
  }

  return "https://yournews.app";
}

export function privacyPolicyUrl(): string {
  return `${getLegalBaseUrl()}/privacy`;
}

export function termsOfServiceUrl(): string {
  return `${getLegalBaseUrl()}/terms`;
}

export function supportUrl(): string {
  return `${getLegalBaseUrl()}/support`;
}

export const SUPPORT_EMAIL = "support@yournews.app";
