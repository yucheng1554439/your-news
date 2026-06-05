import Constants from "expo-constants";

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const extra = Constants.expoConfig?.extra as
    | { apiBaseUrl?: string }
    | undefined;
  const fromExtra = extra?.apiBaseUrl?.trim();
  if (fromExtra) return fromExtra.replace(/\/$/, "");

  return "http://localhost:3000/api/v1";
}

/** Full URL for an API path — useful for debugging device connectivity. */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function getClerkPublishableKey(): string {
  const extra = Constants.expoConfig?.extra as
    | { clerkPublishableKey?: string }
    | undefined;
  const key =
    extra?.clerkPublishableKey?.trim() ||
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!key) {
    console.warn(
      "[Your News] Missing Clerk publishable key. Set expo.extra.clerkPublishableKey in app.json or EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY."
    );
    return "pk_test_placeholder_configure_clerk_key";
  }
  return key;
}

export type ApiErrorBody = {
  ok: false;
  error: string;
  category?: string;
  code?: string;
};

export class ApiClientError extends Error {
  status: number;
  category?: string;
  code?: string;

  constructor(message: string, status: number, extra?: ApiErrorBody) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.category = extra?.category;
    this.code = extra?.code;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const url = getApiUrl(path);

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => null)) as T | ApiErrorBody | null;

  if (!res.ok) {
    const errBody = body as ApiErrorBody | null;
    throw new ApiClientError(
      errBody?.error ?? `Request failed (${res.status})`,
      res.status,
      errBody ?? undefined
    );
  }

  return body as T;
}
