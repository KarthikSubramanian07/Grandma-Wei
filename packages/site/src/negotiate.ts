/**
 * HTTP content negotiation between HTML and Markdown (RFC 9110 Accept header).
 * Markdown wins when the client asks for text/markdown with a quality at least
 * as high as text/html (or doesn't mention HTML at all).
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  let md = -1;
  let html = -1;
  let any = -1;
  for (const part of accept.split(",")) {
    const [typeRaw, ...params] = part.trim().split(";");
    const type = (typeRaw ?? "").trim().toLowerCase();
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    if (!Number.isFinite(q)) continue;
    if (type === "text/markdown" || type === "text/x-markdown") md = Math.max(md, q);
    else if (type === "text/html" || type === "application/xhtml+xml") html = Math.max(html, q);
    else if (type === "*/*" || type === "text/*") any = Math.max(any, q);
  }
  if (md <= 0) return false;
  // "*/*" alone doesn't outrank an explicit text/markdown.
  void any;
  return md >= html;
}
