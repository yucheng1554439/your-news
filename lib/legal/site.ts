/** Public site URLs for legal pages and App Store metadata. */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;

  return "https://yournews.app";
}

export const LEGAL = {
  companyName: "Your News",
  supportEmail: "support@yournews.app",
  privacyEmail: "privacy@yournews.app",
  lastUpdated: "June 3, 2026",
  effectiveDate: "June 3, 2026",
} as const;

export function privacyPolicyUrl(): string {
  return `${getAppBaseUrl()}/privacy`;
}

export function termsOfServiceUrl(): string {
  return `${getAppBaseUrl()}/terms`;
}

export function supportUrl(): string {
  return `${getAppBaseUrl()}/support`;
}
