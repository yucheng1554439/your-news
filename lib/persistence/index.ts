export {
  getRedisClient,
  getRedisConfigDiagnostics,
  getRedisConfigSource,
  isRedisConfigured,
  pingRedis,
  resolveRedisCredentials,
  redisGet,
  redisSet,
  redisDel,
  type RedisConfigDiagnostics,
} from "@/lib/persistence/redis-client";

export {
  isVercelDeployment,
  isRemotePersistenceConfigured,
  isPersistenceAvailable,
  requireRedisForPersistence,
  persistGet,
  persistSet,
  type PersistBackend,
  type PersistSetResult,
} from "@/lib/persistence/kv-store";

export {
  readPlatformIntelligenceSnapshot,
  writePlatformIntelligenceSnapshot,
  type PlatformIntelligenceSnapshot,
} from "@/lib/persistence/intelligence-snapshot-persist";

export {
  readPersistedStoryPool,
  writePersistedStoryPool,
  isStoryPoolPersistenceEnabled,
  type PersistedStoryPool,
} from "@/lib/persistence/story-pool-persist";

export {
  readPersistedArticleBody,
  writePersistedArticleBody,
  type PersistedArticleBody,
} from "@/lib/persistence/article-body-persist";

export {
  readPersistedWeeklyBriefing,
  writePersistedWeeklyBriefing,
} from "@/lib/persistence/weekly-briefing-persist";
