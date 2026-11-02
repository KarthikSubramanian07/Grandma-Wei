/** FNV-1a: a tiny stable hash so the same room always gets the same lines. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pick<T>(items: readonly T[], seed: string, salt = ""): T {
  if (items.length === 0) throw new Error("pick from empty list");
  return items[hash(seed + "|" + salt) % items.length]!;
}
