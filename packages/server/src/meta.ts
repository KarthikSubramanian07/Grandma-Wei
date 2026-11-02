import type { SharePayload } from "./result";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Head tags for a shared scorecard page. The preview image is a pre-rendered
 * card for the score; her headline travels as the link's title and text,
 * which is what chat apps show next to the image.
 */
export function shareMeta(p: SharePayload, origin: string): { title: string; tags: string } {
  const room = p.kind.replace(/_/g, " ");
  const title =
    p.score === null ? `Grandma Wei looked at this ${room}` : `Grandma Wei gave this ${room} ${p.score}/100`;
  const description = p.headline;
  const image = `${origin}/og/${p.score ?? "unknown"}.png`;
  const url = `${origin}/s/${p.id}`;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Grandma Wei">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(`${p.score ?? "?"} out of 100. ${p.grade ?? ""}`)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="robots" content="noindex">`,
  ].join("\n    ");
  return { title, tags };
}
