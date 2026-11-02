import { expect, test, type APIResponse } from "@playwright/test";

// Agent-readiness: honest status codes, Markdown negotiation, no-JS content,
// llms.txt, structured data, trust pages. HTTP-level, so run once.
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop", "HTTP checks run once");
});

const MD = { Accept: "text/markdown" };
const HTML = { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" };
const PAGES = ["/", "/how", "/privacy", "/about", "/contact"];

const visibleText = (html: string) =>
  html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const varyHasAccept = (r: APIResponse) => /\baccept\b/i.test(r.headers()["vary"] ?? "");

test.describe("status codes", () => {
  test("unknown paths are a real 404, with an HTML page", async ({ request }) => {
    const r = await request.get("/some-path-that-does-not-exist", { headers: HTML });
    expect(r.status()).toBe(404);
    expect(r.headers()["content-type"]).toContain("text/html");
    expect(await r.text()).toContain("Not found");
  });

  test("unknown paths answer Markdown agents with a Markdown 404 that points to llms.txt", async ({ request }) => {
    const r = await request.get("/some-path-that-does-not-exist", { headers: MD });
    expect(r.status()).toBe(404);
    expect(r.headers()["content-type"]).toContain("text/markdown");
    const body = await r.text();
    expect(body.length).toBeGreaterThan(20);
    expect(body).toContain("/llms.txt");
    expect(body).toContain("/sitemap.xml");
  });

  test("missing assets and unknown practice rooms are 404s too", async ({ request }) => {
    expect((await request.get("/assets/nope.js")).status()).toBe(404);
    expect((await request.get("/practice/nowhere", { headers: HTML })).status()).toBe(404);
    expect((await request.get("/nope.md")).status()).toBe(404);
  });

  test("app routes still load the app", async ({ request }) => {
    for (const path of ["/practice/traveler", "/fridge", "/read", "/visit/abcdef123"]) {
      const r = await request.get(path, { headers: HTML });
      expect(r.status(), path).toBe(200);
      expect(await r.text(), path).toContain('<div id="root"></div>');
    }
  });
});

test.describe("Markdown negotiation", () => {
  for (const path of PAGES) {
    test(`${path} serves Markdown to Accept: text/markdown and HTML otherwise`, async ({ request }) => {
      const md = await request.get(path, { headers: MD });
      expect(md.status()).toBe(200);
      expect(md.headers()["content-type"]).toContain("text/markdown");
      expect(varyHasAccept(md)).toBe(true);
      expect((await md.text()).startsWith("# ")).toBe(true);

      const html = await request.get(path, { headers: HTML });
      expect(html.status()).toBe(200);
      expect(html.headers()["content-type"]).toContain("text/html");
      expect(varyHasAccept(html)).toBe(true);
    });
  }

  test("every page is also at its .md URL", async ({ request }) => {
    for (const path of ["/index.md", "/how.md", "/privacy.md", "/about.md", "/contact.md"]) {
      const r = await request.get(path);
      expect(r.status(), path).toBe(200);
      expect(r.headers()["content-type"], path).toContain("text/markdown");
    }
  });
});

test.describe("content without JavaScript", () => {
  for (const path of PAGES) {
    test(`${path} has an H1 and real text in the raw HTML`, async ({ request }) => {
      const html = await (await request.get(path, { headers: HTML })).text();
      expect(html).toMatch(/<h1>[^<]+<\/h1>/);
      expect(visibleText(html).length).toBeGreaterThanOrEqual(500);
    });
  }

  test("with JavaScript, the app replaces the pre-rendered copy", async ({ page }) => {
    await page.goto("/how");
    await expect(page.locator(".how-card")).toHaveCount(5);
    await expect(page.locator("#prerender")).toHaveCount(0);
  });

  test("about and contact pages render in the app", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Grandma Wei");
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact");
  });
});

test.describe("machine-readable files", () => {
  test("llms.txt follows llmstxt.org and says when to use it", async ({ request }) => {
    const r = await request.get("/llms.txt");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("text/plain");
    const body = await r.text();
    expect(body.startsWith("# Grandma Wei\n")).toBe(true);
    expect(body).toContain("## When to use");
  });

  test("the sitemap lists every public page", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/how", "/privacy", "/about", "/contact"]) expect(xml).toContain(`https://grandma-wei.pages.dev${path}</loc>`);
  });

  test("robots.txt allows the documented API and the sitemap", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toContain("Allow: /api/sample/");
    expect(txt).toContain("Sitemap: https://grandma-wei.pages.dev/sitemap.xml");
  });

  test("JSON-LD has an Organization with a contact point", async ({ request }) => {
    const html = await (await request.get("/", { headers: HTML })).text();
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]!);
    const org = json["@graph"].find((n: { "@type": string }) => n["@type"] === "Organization");
    expect(org.name).toBe("Grandma Wei");
    expect(org.contactPoint.contactType).toBe("customer support");
    const app = json["@graph"].find((n: { "@type": string }) => n["@type"] === "WebApplication");
    expect(app.keywords).toContain("feng shui");
  });

  test("share pages still get their own preview tags", async ({ request }) => {
    const env = await (await request.get("/api/sample/traveler")).json();
    const share = await (await request.post("/api/share", { data: { signed: env.signed, sig: env.sig } })).json();
    const html = await (await request.get(share.path, { headers: HTML })).text();
    expect(html).toContain("Grandma Wei gave this bedroom 49/100");
    expect(html).not.toContain('id="prerender"');
  });
});
