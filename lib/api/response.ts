import "server-only";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export function apiJson<T>(
  data: T,
  init?: ResponseInit & { status?: number }
): Response {
  return Response.json(data, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export function apiError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
): Response {
  return apiJson(
    { ok: false, error: message, ...extra },
    { status }
  );
}

export function apiOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export const API_VERSION = "v1" as const;
