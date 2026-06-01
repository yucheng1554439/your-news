export type PersistenceErrorCategory =
  | "validation"
  | "network"
  | "metadata_size"
  | "clerk_metadata"
  | "auth"
  | "unknown";

export type ClassifiedPersistenceError = {
  category: PersistenceErrorCategory;
  /** User-facing message */
  message: string;
  /** Server log detail */
  detail: string;
  statusCode?: number;
};

function errorText(err: unknown): string {
  if (err instanceof Error) {
    return [err.message, err.name, err.stack].filter(Boolean).join(" | ");
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function statusFromError(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const record = err as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (typeof record.statusCode === "number") return record.statusCode;
  const errors = record.errors;
  if (Array.isArray(errors) && errors[0] && typeof errors[0] === "object") {
    const first = errors[0] as Record<string, unknown>;
    if (typeof first.code === "string" && first.code.includes("422")) return 422;
  }
  return undefined;
}

export function classifyPersistenceError(
  err: unknown,
  context?: string
): ClassifiedPersistenceError {
  const detail = errorText(err);
  const lower = detail.toLowerCase();
  const statusCode = statusFromError(err);
  const prefix = context ? `${context}: ` : "";

  if (
    lower.includes("8kb") ||
    lower.includes("8 kb") ||
    lower.includes("metadata is too large") ||
    lower.includes("metadata size") ||
    lower.includes("payload too large") ||
    lower.includes("exceeds the maximum")
  ) {
    return {
      category: "metadata_size",
      message:
        "Your profile data exceeds Clerk storage limits (8KB). Try removing saved stories or clearing topic exclusions.",
      detail: `${prefix}${detail}`,
      statusCode,
    };
  }

  if (
    statusCode === 422 ||
    lower.includes("unprocessable") ||
    lower.includes("invalid metadata") ||
    lower.includes("public_metadata") ||
    lower.includes("metadata")
  ) {
    return {
      category: "clerk_metadata",
      message:
        "Clerk rejected the profile update. Your account metadata may be full or invalid — check server logs for details.",
      detail: `${prefix}${detail}`,
      statusCode,
    };
  }

  if (
    statusCode === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return {
      category: "network",
      message: "Too many save attempts. Wait a moment and try again.",
      detail: `${prefix}${detail}`,
      statusCode,
    };
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("socket") ||
    lower.includes("timeout") ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504
  ) {
    return {
      category: "network",
      message: "Network error while saving. Check your connection and try again.",
      detail: `${prefix}${detail}`,
      statusCode,
    };
  }

  return {
    category: "unknown",
    message: `Save failed: ${err instanceof Error ? err.message : "unexpected error"}`,
    detail: `${prefix}${detail}`,
    statusCode,
  };
}
