/**
 * Storage: rate-limit counters and shared scorecards. D1 in production,
 * memory in tests. Shares hold only the scorecard text, never a photo.
 */

export interface Store {
  /** Increment a counter and return its new value. */
  bump(key: string, bucket: number): Promise<number>;
  /** Forget counters older than a bucket. */
  sweep(prefix: string, before: number): Promise<void>;
  putShare(id: string, deleteHash: string, payload: string, created: number): Promise<void>;
  getShare(id: string): Promise<{ payload: string; deleteHash: string } | null>;
  deleteShare(id: string): Promise<boolean>;
}

export class D1Store implements Store {
  constructor(private db: D1Database) {}

  async bump(key: string, bucket: number): Promise<number> {
    const row = await this.db
      .prepare(
        "INSERT INTO hits (key, bucket, n) VALUES (?1, ?2, 1) ON CONFLICT(key, bucket) DO UPDATE SET n = n + 1 RETURNING n",
      )
      .bind(key, bucket)
      .first<{ n: number }>();
    return row?.n ?? 1;
  }

  async sweep(prefix: string, before: number): Promise<void> {
    await this.db.prepare("DELETE FROM hits WHERE key LIKE ?1 AND bucket < ?2").bind(`${prefix}%`, before).run();
  }

  async putShare(id: string, deleteHash: string, payload: string, created: number): Promise<void> {
    await this.db
      .prepare("INSERT INTO shares (id, created, delete_hash, payload) VALUES (?1, ?2, ?3, ?4)")
      .bind(id, created, deleteHash, payload)
      .run();
  }

  async getShare(id: string) {
    const row = await this.db
      .prepare("SELECT payload, delete_hash FROM shares WHERE id = ?1")
      .bind(id)
      .first<{ payload: string; delete_hash: string }>();
    return row ? { payload: row.payload, deleteHash: row.delete_hash } : null;
  }

  async deleteShare(id: string): Promise<boolean> {
    const res = await this.db.prepare("DELETE FROM shares WHERE id = ?1").bind(id).run();
    return (res.meta?.changes ?? 0) > 0;
  }
}

/** Shared links last a year, then quietly disappear. */
export const SHARE_TTL_SECONDS = 365 * 24 * 3600;

/**
 * Workers KV. Counters are approximate (KV is eventually consistent), which
 * is fine for rate limits; they expire on their own, so nothing needs sweeping.
 */
export class KVStore implements Store {
  constructor(private kv: KVNamespace) {}

  async bump(key: string, bucket: number): Promise<number> {
    const k = `hit:${key}:${bucket}`;
    const n = Number((await this.kv.get(k)) ?? 0) + 1;
    await this.kv.put(k, String(n), { expirationTtl: 2 * 86_400 });
    return n;
  }

  async sweep(): Promise<void> {}

  async putShare(id: string, deleteHash: string, payload: string, created: number): Promise<void> {
    await this.kv.put(`share:${id}`, JSON.stringify({ payload, deleteHash, created }), { expirationTtl: SHARE_TTL_SECONDS });
  }

  async getShare(id: string) {
    const v = await this.kv.get<{ payload: string; deleteHash: string }>(`share:${id}`, "json");
    return v ? { payload: v.payload, deleteHash: v.deleteHash } : null;
  }

  async deleteShare(id: string): Promise<boolean> {
    await this.kv.delete(`share:${id}`);
    return true;
  }
}

/** Pick storage from the bindings: D1 if bound, else KV, else none (sharing off). */
export function storeFromEnv(env: { DB?: D1Database; KV?: KVNamespace }): Store | null {
  if (env.DB) return new D1Store(env.DB);
  if (env.KV) return new KVStore(env.KV);
  return null;
}

export class MemoryStore implements Store {
  hits = new Map<string, number>();
  shares = new Map<string, { payload: string; deleteHash: string; created: number }>();

  async bump(key: string, bucket: number) {
    const k = `${key}@${bucket}`;
    const n = (this.hits.get(k) ?? 0) + 1;
    this.hits.set(k, n);
    return n;
  }
  async sweep() {}
  async putShare(id: string, deleteHash: string, payload: string, created: number) {
    this.shares.set(id, { payload, deleteHash, created });
  }
  async getShare(id: string) {
    return this.shares.get(id) ?? null;
  }
  async deleteShare(id: string) {
    return this.shares.delete(id);
  }
}
