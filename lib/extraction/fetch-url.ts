import "server-only";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 1_500_000;

export async function fetchArticleHtml(
  url: string
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; YourNewsBot/1.0; +https://your-news.app)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("xml")) {
      return { ok: false, error: "Not HTML" };
    }

    const html = await res.text();
    if (html.length > MAX_HTML_BYTES) {
      return { ok: false, error: "Response too large" };
    }

    if (html.length < 500) {
      return { ok: false, error: "Response too small" };
    }

    return { ok: true, html };
  } catch {
    return { ok: false, error: "Fetch failed" };
  }
}
