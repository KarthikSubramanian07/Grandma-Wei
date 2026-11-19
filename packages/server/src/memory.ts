/**
 * Grandma never forgets a photo she's seen, so the same photo always gets the
 * same reading (and costs nothing the second time).
 *
 * What's kept is her description of the room (the Scene), never the photo.
 * It's stored under a hash of the photo and encrypted (AES-GCM) with a key
 * that is also derived from the photo. Without the exact photo, an entry can
 * be neither found nor read, not even by whoever runs the server. Entries
 * expire after 30 days.
 */

import { Scene } from "@gw/schema";
import type { Store } from "./store";

export const MEMORY_TTL_SECONDS = 30 * 24 * 3600;

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));

export interface PhotoMemory {
  /** Where the entry lives. Reveals nothing about the key. */
  id: string;
  key: CryptoKey;
}

/**
 * The lookup id and the encryption key both come from the photo, with
 * different labels so one can't be turned into the other. `version` names
 * the eyes (model and prompt), so a new model doesn't reuse old answers.
 */
export async function photoMemory(image: string, version: string): Promise<PhotoMemory> {
  const id = b64url(await digest(`grandma-wei:memory:id:${version}:${image}`));
  const raw = await digest(`grandma-wei:memory:key:${version}:${image}`);
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  return { id, key };
}

export async function seal(m: PhotoMemory, scene: Scene): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, m.key, enc.encode(JSON.stringify(scene))));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64url(out);
}

export async function unseal(m: PhotoMemory, blob: string): Promise<Scene | null> {
  try {
    const bytes = fromB64url(blob);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, m.key, bytes.slice(12));
    // Already sanitized before it was sealed, and GCM proves it's untouched,
    // so it's returned exactly as stored: the same photo gets the same scene.
    const parsed = Scene.safeParse(JSON.parse(dec.decode(pt)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The scene she saw last time for this exact photo, if she remembers it. */
export async function recall(store: Store | null, m: PhotoMemory): Promise<Scene | null> {
  if (!store) return null;
  try {
    const blob = await store.getMemory(m.id);
    return blob ? await unseal(m, blob) : null;
  } catch {
    return null;
  }
}

/** Remember a scene. Best effort: a failure here never fails the reading. */
export async function remember(store: Store | null, m: PhotoMemory, scene: Scene): Promise<void> {
  if (!store) return;
  try {
    await store.putMemory(m.id, await seal(m, scene), Date.now());
  } catch {
    // Forgetting is allowed.
  }
}
