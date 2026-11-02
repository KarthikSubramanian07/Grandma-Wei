/**
 * Rate limiting: per visitor per hour, and a global daily cap so a busy day
 * can't run up an unbounded bill. Visitors are keyed by a salted hash of
 * their IP; the IP itself is never written down.
 */

import { sha256 } from "./sign";
import type { Store } from "./store";

export interface LimitResult {
  ok: boolean;
  reason?: "visitor" | "daily";
}

export async function checkLimit(
  store: Store | null,
  ip: string,
  salt: string,
  perHour: number,
  perDay: number,
  now = Date.now(),
): Promise<LimitResult> {
  if (!store) return { ok: true };
  const hour = Math.floor(now / 3_600_000);
  const day = Math.floor(now / 86_400_000);
  const visitor = await sha256(`${salt}:${ip}`);
  const [v, g] = await Promise.all([store.bump(`v:${visitor}`, hour), store.bump("global", day)]);
  // Now and then, forget old visitor counters.
  if (hour % 7 === 0 && v === 1) await store.sweep("v:", hour - 48).catch(() => {});
  if (v > perHour) return { ok: false, reason: "visitor" };
  if (g > perDay) return { ok: false, reason: "daily" };
  return { ok: true };
}
