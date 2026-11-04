import { describe, expect, test } from "bun:test";
import { MemoryStore } from "./store";
import { photoMemory, recall, remember, seal, unseal } from "./memory";
import { SAMPLES } from "./samples";

const scene = SAMPLES.traveler!.scene;
const photo = "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=";
const other = "WllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkE=";

describe("photo memory", () => {
  test("the same photo finds and opens the same memory", async () => {
    const a = await photoMemory(photo, "groq:m:p");
    const b = await photoMemory(photo, "groq:m:p");
    expect(a.id).toBe(b.id);
    expect(await unseal(b, await seal(a, scene))).toEqual(scene);
  });

  test("a different photo, or different eyes, can neither find nor open it", async () => {
    const mine = await photoMemory(photo, "groq:m:p");
    const theirs = await photoMemory(other, "groq:m:p");
    const newEyes = await photoMemory(photo, "groq:m2:p");
    expect(theirs.id).not.toBe(mine.id);
    expect(newEyes.id).not.toBe(mine.id);
    const blob = await seal(mine, scene);
    expect(await unseal(theirs, blob)).toBeNull();
    expect(await unseal(newEyes, blob)).toBeNull();
  });

  test("what's stored is ciphertext: no room details, no photo, and a fresh nonce each time", async () => {
    const m = await photoMemory(photo, "v");
    const one = await seal(m, scene);
    const two = await seal(m, scene);
    expect(one).not.toBe(two);
    // Ciphertext is random letters, so a short word like "bed" can turn up by
    // chance. Look for real leaks instead: any 12-character run of the scene's
    // JSON in the raw bytes, or the photo or lookup id in the stored text.
    const raw = String.fromCharCode(...Uint8Array.from(atob(one.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
    const plain = JSON.stringify(scene);
    for (let i = 0; i + 12 <= plain.length; i += 6) expect(raw).not.toContain(plain.slice(i, i + 12));
    for (const leak of [photo, m.id]) expect(one).not.toContain(leak);
  });

  test("tampered or broken entries are ignored, and storage failures never throw", async () => {
    const m = await photoMemory(photo, "v");
    const blob = await seal(m, scene);
    const flipped = blob.slice(0, -2) + (blob.at(-2) === "A" ? "B" : "A") + blob.slice(-1);
    expect(await unseal(m, flipped)).toBeNull();
    expect(await unseal(m, "not base64 !!")).toBeNull();

    const store = new MemoryStore();
    expect(await recall(store, m)).toBeNull();
    await remember(store, m, scene);
    expect(await recall(store, m)).toEqual(scene);
    expect(await recall(null, m)).toBeNull();

    const broken = new MemoryStore();
    broken.getMemory = async () => {
      throw new Error("kv down");
    };
    broken.putMemory = async () => {
      throw new Error("kv down");
    };
    expect(await recall(broken, m)).toBeNull();
    await remember(broken, m, scene);
  });
});
