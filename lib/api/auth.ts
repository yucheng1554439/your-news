import "server-only";

import { auth, verifyToken } from "@clerk/nextjs/server";

export type ApiAuthResult =
  | { ok: true; userId: string; source: "session" | "bearer" }
  | { ok: false; status: 401; error: string };

/**
 * Resolves the authenticated user from Clerk session cookies (web)
 * or Authorization: Bearer <session_jwt> (mobile).
 */
export async function requireApiUser(req: Request): Promise<ApiAuthResult> {
  const session = await auth();
  if (session.userId) {
    return { ok: true, userId: session.userId, source: "session" };
  }

  const header = req.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (!token) {
      return { ok: false, status: 401, error: "Empty bearer token" };
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error("[API_V1] CLERK_SECRET_KEY is not configured");
      return { ok: false, status: 401, error: "Auth not configured" };
    }

    try {
      const payload = await verifyToken(token, { secretKey });
      const userId = payload.sub;
      if (!userId) {
        return { ok: false, status: 401, error: "Invalid token subject" };
      }
      return { ok: true, userId, source: "bearer" };
    } catch (err) {
      console.warn(
        "[API_V1] bearer_verify_failed",
        err instanceof Error ? err.message : err
      );
      return { ok: false, status: 401, error: "Invalid or expired token" };
    }
  }

  return { ok: false, status: 401, error: "Authentication required" };
}
