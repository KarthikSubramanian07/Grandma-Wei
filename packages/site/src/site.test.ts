import { describe, expect, test } from "bun:test";
import { LLMS_TXT, NOT_FOUND_MARKDOWN, PAGES, markdownToHtml, pageFor, plainText, prefersMarkdown } from "./index";

describe("pages", () => {
  test("every public page has an H1 and at least 500 characters of real text", () => {
    for (const p of PAGES) {
      expect(p.markdown.startsWith("# "), p.path).toBe(true);
      expect(plainText(p.markdown).length, p.path).toBeGreaterThanOrEqual(500);
      expect(p.title.length).toBeGreaterThan(10);
      expect(p.description.length).toBeGreaterThan(40);
    }
  });

  test("heading levels never skip (h1, then h2, ...)", () => {
    for (const p of PAGES) {
      let last = 0;
      for (const m of p.markdown.matchAll(/^(#{1,6})\s/gm)) {
        const level = m[1]!.length;
        expect(level - last, `${p.path}: h${last} to h${level}`).toBeLessThanOrEqual(1);
        last = level;
      }
    }
  });

  test("about, contact and privacy exist for trust checks", () => {
    for (const path of ["/about", "/contact", "/privacy", "/how", "/"]) expect(pageFor(path)).toBeDefined();
    expect(pageFor("/about/")?.path).toBe("/about");
    expect(pageFor("/nope")).toBeUndefined();
  });

  test("the how page lists all eighteen rules", () => {
    const how = pageFor("/how")!.markdown;
    expect((how.match(/^- \*\*/gm) ?? []).length).toBe(18 + 4);
  });

  test("the 404 body is helpful and points agents at llms.txt and the sitemap", () => {
    expect(plainText(NOT_FOUND_MARKDOWN).length).toBeGreaterThan(20);
    expect(NOT_FOUND_MARKDOWN).toContain("/llms.txt");
    expect(NOT_FOUND_MARKDOWN).toContain("/sitemap.xml");
  });
});

describe("llms.txt", () => {
  test("follows the llmstxt.org shape and says when to use it", () => {
    const lines = LLMS_TXT.split("\n");
    expect(lines[0]).toBe("# Grandma Wei");
    expect(LLMS_TXT).toMatch(/\n> .+/);
    expect(LLMS_TXT).toContain("## When to use");
    const linkLines = LLMS_TXT.match(/^- \[[^\]]+\]\(https:\/\/[^)]+\)/gm) ?? [];
    expect(linkLines.length).toBeGreaterThanOrEqual(7);
  });
});

describe("markdownToHtml", () => {
  test("renders headings, lists, links, emphasis and quotes", () => {
    const html = markdownToHtml("# Title\n\nSome **bold** and *soft* text with a [link](https://example.com).\n\n- one\n- two\n\n1. first\n2. second\n\n> said");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>soft</em>");
    expect(html).toContain('<a href="https://example.com" rel="noopener">link</a>');
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<ol><li>first</li><li>second</li></ol>");
    expect(html).toContain("<blockquote><p>said</p></blockquote>");
  });

  test("escapes HTML in the source", () => {
    expect(markdownToHtml("a <script>x</script>")).toBe("<p>a &lt;script&gt;x&lt;/script&gt;</p>");
  });
});

describe("prefersMarkdown", () => {
  test("follows the Accept header", () => {
    expect(prefersMarkdown("text/markdown")).toBe(true);
    expect(prefersMarkdown("text/markdown, text/html;q=0.8")).toBe(true);
    expect(prefersMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
    expect(prefersMarkdown("text/html,application/xhtml+xml,*/*;q=0.8")).toBe(false);
    expect(prefersMarkdown("*/*")).toBe(false);
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown("text/markdown;q=0")).toBe(false);
  });
});
