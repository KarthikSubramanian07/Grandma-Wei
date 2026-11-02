/**
 * A small Markdown-to-HTML converter for our own trusted, hand-written pages:
 * headings, paragraphs, lists, block quotes, links, bold, italic, inline code.
 * It escapes everything else, so it's safe to put the result straight into HTML.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => {
    const external = /^https?:/.test(href) && !href.includes("grandma-wei.pages.dev");
    return `<a href="${href}"${external ? ' rel="noopener"' : ""}>${text}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return out;
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let para: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) html.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    const bq = /^>\s?(.*)$/.exec(line);
    if (!line.trim()) {
      flushAll();
    } else if (h) {
      flushAll();
      const level = h[1]!.length;
      html.push(`<h${level}>${inline(h[2]!)}</h${level}>`);
    } else if (ul || ol) {
      flushPara();
      flushQuote();
      const tag = ul ? "ul" : "ol";
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push((ul ?? ol)![1]!);
    } else if (bq) {
      flushPara();
      flushList();
      quote.push(bq[1]!);
    } else if (list && /^\s{2,}\S/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
    } else {
      flushList();
      flushQuote();
      para.push(line.trim());
    }
  }
  flushAll();
  return html.join("\n");
}

/** Visible text of a Markdown document, for length checks. */
export function plainText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*`_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
