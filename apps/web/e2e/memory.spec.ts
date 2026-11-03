import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// Same photo, same reading, through the real Pages runtime: real KV, real
// AES-GCM, with the test stand-in for her eyes. HTTP-level, so run once.
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop", "HTTP checks run once");
});

const photo = readFileSync(join(import.meta.dirname, "../public/samples/traveler.jpg")).toString("base64");

test("she remembers a photo she has read, and only that photo", async ({ request }) => {
  // Local KV persists between runs, so make this run's photo unique.
  const salt = Array.from({ length: 16 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]).join("");
  const mine = photo + salt;
  const read = (image: string) => request.post("/api/read", { data: { image, media_type: "image/jpeg" } });

  const first = await read(mine);
  expect(first.status()).toBe(200);
  expect(first.headers()["x-grandma-remembered"]).toBeUndefined();
  const a = (await first.json()).result;

  const again = await read(mine);
  expect(again.status()).toBe(200);
  expect(again.headers()["x-grandma-remembered"]).toBe("1");
  const b = (await again.json()).result;
  expect(b.scene).toEqual(a.scene);
  expect(b.reading).toEqual(a.reading);
  expect(b.voice).toEqual(a.voice);
  expect(b.id).not.toBe(a.id);

  const other = await read(mine.slice(0, -1) + (mine.endsWith("A") ? "B" : "A"));
  expect(other.status()).toBe(200);
  expect(other.headers()["x-grandma-remembered"]).toBeUndefined();
});
