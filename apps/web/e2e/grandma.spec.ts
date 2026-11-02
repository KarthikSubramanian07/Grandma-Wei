import { expect, test } from "@playwright/test";
import { join } from "node:path";

const PHOTO = join(import.meta.dirname, "../public/samples/traveler.jpg");

test.describe("home", () => {
  test("one clear action and three practice rooms", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Show Grandma");
    const primary = page.locator(".hero .picker .btn").first();
    await expect(primary).toBeVisible();
    await expect(page.locator(".polaroids a")).toHaveCount(3);
    // The main button is on the first screen, without scrolling.
    const box = await primary.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(page.viewportSize()!.height);
  });

  test("has the SEO basics", async ({ page, request }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Grandma Wei/);
    expect(await page.locator('meta[property="og:image"]').getAttribute("content")).toContain("/og/site.png");
    expect((await request.get("/robots.txt")).ok()).toBe(true);
    expect((await request.get("/sitemap.xml")).ok()).toBe(true);
    expect((await request.get("/og/site.png")).headers()["content-type"]).toBe("image/png");
  });
});

test.describe("practice room", () => {
  test("reads the Traveler: score, verdict, notes, chores", async ({ page }) => {
    await page.goto("/practice/traveler");
    await expect(page.locator(".sc-score .display")).toHaveText("49", { timeout: 10_000 });
    await expect(page.locator(".sc-grade .italic")).toHaveText("Worrying.");
    await expect(page.locator(".sc-verdict > p")).toContainText("coffin");
    await expect(page.locator(".photo-notes .note")).not.toHaveCount(0);
    await expect(page.locator(".sc-chores li")).toHaveCount(3);
  });

  test("ticking a chore shows the new score, and the sketch follows", async ({ page }) => {
    await page.goto("/practice/traveler");
    await expect(page.locator(".sc-score .display")).toHaveText("49", { timeout: 10_000 });
    await page.locator(".sc-chores li").first().locator("label").click();
    await expect(page.locator(".sc-projected")).toContainText("83");
    await page.getByRole("tab", { name: "How energy moves" }).click();
    await expect(page.locator(".sketch canvas")).toBeVisible();
    await expect(page.getByText("This is your room with the ticked chores done.")).toBeVisible();
  });

  test("pretend every chore reaches the potential", async ({ page }) => {
    await page.goto("/practice/traveler");
    await page.getByRole("button", { name: "Pretend I did every chore" }).click();
    await expect(page.locator(".sc-projected")).toContainText("96");
    await expect(page.locator(".sc-grade .italic")).toHaveText("I'd sleep here.");
  });

  test("a room with no door in view asks for a better angle", async ({ page }) => {
    await page.goto("/practice/attic");
    await expect(page.locator(".talk-ask").first()).toContainText("door");
  });
});

test.describe("your own photo", () => {
  test("photo, reading, retake: the score climbs and magnets land", async ({ page }) => {
    await page.goto("/");
    await page.locator('.hero input[type=file]:not([capture])').setInputFiles(PHOTO);
    await expect(page).toHaveURL(/\/visit\//, { timeout: 20_000 });
    await expect(page.locator(".sc-score .display")).toHaveText("49");
    await expect(page.locator(".sc-head .mono")).toContainText("Her reading");

    await page.locator('.next input[type=file]:not([capture])').setInputFiles(PHOTO);
    await expect(page.locator(".retake")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".retake-delta")).toContainText("+");
    await expect(page.locator(".magnet-chip").first()).toBeVisible();

    await page.goto("/fridge");
    await expect(page.locator(".visit")).toHaveCount(2);
    await expect(page.locator(".magnets li.has")).not.toHaveCount(0);
    await expect(page.locator(".ba")).toBeVisible();
  });

  test("on a phone, the in-app camera takes the photo", async ({ page }) => {
    test.skip(test.info().project.name === "desktop", "touch devices open the camera from the main button");
    await page.goto("/");
    await page.locator(".hero .picker .btn").first().click();
    const camera = page.getByRole("dialog", { name: "Take a photo of your room" });
    await expect(camera).toBeVisible();
    await expect(camera.getByRole("button", { name: "Take the photo" })).toBeEnabled({ timeout: 10_000 });
    await camera.getByRole("button", { name: "Take the photo" }).click();
    await expect(page).toHaveURL(/\/visit\//, { timeout: 20_000 });
    await expect(page.locator(".sc-score .display")).toHaveText("49");
  });

  test("the camera closes cleanly and offers the photo library", async ({ page }) => {
    test.skip(test.info().project.name === "desktop", "touch only");
    await page.goto("/");
    await page.locator(".hero .picker .btn").first().click();
    const camera = page.getByRole("dialog", { name: "Take a photo of your room" });
    await expect(camera.getByRole("button", { name: "Photos" })).toBeVisible();
    await camera.getByRole("button", { name: "Close the camera" }).click();
    await expect(camera).toBeHidden();
  });

  test("a file that isn't an image gets a kind message, not a crash", async ({ page }) => {
    await page.goto("/");
    await page.locator('.hero input[type=file]:not([capture])').setInputFiles({
      name: "notes.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("definitely not a photo"),
    });
    await expect(page.locator(".trouble-msg")).toContainText("couldn't open");
  });
});

test.describe("sharing", () => {
  test("a shared link unfurls with her verdict and can be deleted", async ({ page, request }) => {
    const env = await (await request.get("/api/sample/traveler")).json();
    const share = await (await request.post("/api/share", { data: { signed: env.signed, sig: env.sig } })).json();
    const html = await (await request.get(share.path)).text();
    expect(html).toContain("Grandma Wei gave this bedroom 49/100");
    expect(html).toContain("/og/49.png");
    expect(html).not.toContain("traveler.jpg");

    await page.goto(share.path);
    await expect(page.locator(".sc-verdict > p")).toContainText("coffin");
    await expect(page.getByRole("heading", { name: "Your turn." })).toBeVisible();

    const del = await request.delete(`/api/share/${share.id}`, { headers: { "x-delete-token": share.delete_token } });
    expect(del.ok()).toBe(true);
    expect((await request.get(share.path)).status()).toBe(404);
  });

  test("saving the scorecard makes a real PNG", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "downloads are checked once");
    await page.goto("/practice/traveler");
    await expect(page.locator(".sc-score .display")).toHaveText("49", { timeout: 10_000 });
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 30_000 }), page.getByRole("button", { name: "Save as a post" }).click()]);
    expect(download.suggestedFilename()).toMatch(/grandma-wei-49-post\.png/);
    const buf = await (await download.createReadStream()).toArray();
    expect(Buffer.concat(buf).subarray(1, 4).toString()).toBe("PNG");
  });
});

test.describe("pages", () => {
  test("how she judges and privacy read plainly", async ({ page }) => {
    await page.goto("/how");
    await expect(page.locator(".how-card")).toHaveCount(5);
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your room, your business");
  });

  test("every image has alt text and every button a name", async ({ page }) => {
    for (const path of ["/", "/practice/traveler", "/fridge", "/how"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const missingAlt = await page.locator("img:not([alt])").count();
      expect(missingAlt, `${path} images without alt`).toBe(0);
      const unnamed = await page.evaluate(() =>
        [...document.querySelectorAll("button")].filter((b) => !(b.textContent?.trim() || b.getAttribute("aria-label"))).length,
      );
      expect(unnamed, `${path} buttons without a name`).toBe(0);
    }
  });
});
