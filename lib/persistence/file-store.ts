import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "persistent");

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function filePath(key: string): string {
  const safe = key.replace(/[^a-z0-9:_-]/gi, "_").slice(0, 120);
  return path.join(DATA_DIR, `${safe}.json`);
}

export function isFilePersistenceEnabled(): boolean {
  return process.env.NEWS_FILE_PERSISTENCE !== "false";
}

export async function fileGet<T>(key: string): Promise<T | null> {
  if (!isFilePersistenceEnabled()) return null;
  try {
    const raw = await readFile(filePath(key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function fileSet<T>(key: string, value: T): Promise<boolean> {
  if (!isFilePersistenceEnabled()) return false;
  try {
    await ensureDir();
    await writeFile(filePath(key), JSON.stringify(value), "utf8");
    return true;
  } catch (err) {
    console.error(`[PERSIST] File SET failed for ${key}:`, err);
    return false;
  }
}
