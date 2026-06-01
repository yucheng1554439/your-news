/** Clerk publicMetadata hard limit — https://clerk.com/docs/guides/users/extending */
export const CLERK_PUBLIC_METADATA_MAX_BYTES = 8192;

/** Leave headroom for Clerk serialization overhead. */
export const CLERK_PUBLIC_METADATA_SAFE_BYTES = 7680;

export function jsonByteSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export type MetadataSizeReport = {
  payloadSize: number;
  withinLimit: boolean;
  withinSafeLimit: boolean;
  keySizes: Record<string, number>;
};

export function metadataSizeReport(
  metadata: Record<string, unknown>
): MetadataSizeReport {
  const keySizes: Record<string, number> = {};
  for (const key of Object.keys(metadata)) {
    keySizes[key] = jsonByteSize(metadata[key]);
  }
  const payloadSize = jsonByteSize(metadata);
  return {
    payloadSize,
    withinLimit: payloadSize <= CLERK_PUBLIC_METADATA_MAX_BYTES,
    withinSafeLimit: payloadSize <= CLERK_PUBLIC_METADATA_SAFE_BYTES,
    keySizes,
  };
}
