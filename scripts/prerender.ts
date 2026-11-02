/**
 * After `vite build`: write real content into the HTML so crawlers and
 * no-JavaScript visitors can read it, plus the files agents look for.
 *
 *   dist/index.html, how.html, privacy.html, about.html, contact.html
 *       pre-rendered pages (React takes over on load)
 *   dist/shell.html   the empty app shell, for app routes and share pages
 *   dist/404.html     a real not-found page (Pages serves it with status 404)
 *   dist/*.md         every page as Markdown
 *   dist/llms.txt     llmstxt.org index, with when-to-use guidance
 *   dist/sitemap.xml
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LLMS_TXT, NOT_FOUND_MARKDOWN, ORIGIN, PAGES, markdownToHtml, type Page } from "../packages/site/src/index";

const dist = join(import.meta.dir, "../apps/web/dist");
const shell = readFileSync(join(dist, "index.html"), "utf8");
if (!shell.includes("<!--meta:start-->") || !shell.includes('<div id="root"></div>')) {
  throw new Error("dist/index.html is missing the meta markers or the empty root; run vite build first");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function meta(p: Page): string {
  const url = `${ORIGIN}${p.path}`;
  return [
    "<!--meta:start-->",
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" type="text/markdown" href="${ORIGIN}${p.path === "/" ? "/index" : p.path}.md" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Grandma Wei" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${ORIGIN}/og/site.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(p.title)}" />`,
    `<meta name="twitter:description" content="${esc(p.description)}" />`,
    `<meta name="twitter:image" content="${ORIGIN}/og/site.png" />`,
    "<!--meta:end-->",
  ].join("\n    ");
}

function page(p: Page, markdown = p.markdown): string {
  return shell
    .replace(/<!--meta:start-->[\s\S]*?<!--meta:end-->/, meta(p))
    .replace('<div id="root"></div>', `<div id="root"><main id="prerender" class="prerender">\n${markdownToHtml(markdown)}\n</main></div>`);
}

writeFileSync(join(dist, "shell.html"), shell);
for (const p of PAGES) {
  const name = p.path === "/" ? "index" : p.path.slice(1);
  writeFileSync(join(dist, `${name}.html`), page(p));
  writeFileSync(join(dist, `${name}.md`), p.markdown);
}
writeFileSync(
  join(dist, "404.html"),
  page({ path: "/404", title: "Not found · Grandma Wei", description: "There's no page here.", markdown: NOT_FOUND_MARKDOWN }).replace(
    /<link rel="canonical"[^>]*>\n\s*<link rel="alternate"[^>]*>/,
    '<meta name="robots" content="noindex" />',
  ),
);
writeFileSync(join(dist, "llms.txt"), LLMS_TXT);
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map(
    (p) => `  <url><loc>${ORIGIN}${p.path}</loc><changefreq>${p.path === "/" ? "weekly" : "monthly"}</changefreq><priority>${p.path === "/" ? "1.0" : "0.6"}</priority></url>`,
  ).join("\n")}\n</urlset>\n`,
);
console.log(`prerender: ${PAGES.length} pages, 404, shell, llms.txt, sitemap`);
