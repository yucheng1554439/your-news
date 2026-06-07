/**
 * Integration smoke test — requires built Next.js app or running dev server.
 * Run with: npm run test:integration (see docs/TESTING.md)
 */
import { describe, expect, it } from "vitest";

const BASE = process.env.API_TEST_BASE_URL ?? "http://localhost:3000";

describe.skipIf(!process.env.API_TEST_BASE_URL)("GET /api/v1/health", () => {
  it("returns ok and persistence flags", async () => {
    const res = await fetch(`${BASE}/api/v1/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      version: string;
      persistence: { redisConfigured: boolean };
    };
    expect(body.ok).toBe(true);
    expect(body.version).toBe("v1");
    expect(typeof body.persistence.redisConfigured).toBe("boolean");
  });
});
