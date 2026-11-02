// Screenshot pages at phone, tablet and desktop sizes, for design review.
//   node e2e/shots.mjs <path> [name] [sizes=phone,tablet,desktop] [waitMs=1500] [fullPage=1]
//   BASE=https://grandma-wei.pages.dev node e2e/shots.mjs /practice/traveler
import { chromium, devices } from "@playwright/test";

const [, , path = "/", name = "page", sizes = "phone,tablet,desktop", wait = "1500", full = "1"] = process.argv;
const base = process.env.BASE ?? "http://localhost:8788";
const out = process.env.OUT ?? "/tmp/gw-shots";
const VIEW = {
  phone: devices["Pixel 7"],
  tablet: { viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 },
};
const browser = await chromium.launch();
const problems = [];
for (const size of sizes.split(",")) {
  const ctx = await browser.newContext(VIEW[size]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${size}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && problems.push(`${size} console: ${m.text()}`));
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(Number(wait));
  await page.screenshot({ path: `${out}/${name}-${size}.png`, fullPage: full === "1" });
  await ctx.close();
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "no errors");
