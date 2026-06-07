import "server-only";

import { fileDel } from "@/lib/persistence/file-store";
import { isRedisConfigured, redisDel } from "@/lib/persistence/redis-client";

export async function persistDel(key: string): Promise<boolean> {
  if (isRedisConfigured()) {
    await redisDel(key);
  }
  await fileDel(key);
  return isRedisConfigured();
}
