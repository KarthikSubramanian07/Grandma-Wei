import { NOT_FOUND_MARKDOWN, pageFor, prefersMarkdown } from "@gw/site";

interface Env {
  ASSETS: Fetcher;
}

/** Routes the app draws in the browser. They get the empty shell, status 200. */
const APP_ROUTES = [/^\/read\/?$/, /^\/fridge\/?$/, /^\/practice\/(traveler|attic|teak)\/?$/, /^\/visit\/[A-Za-z0-9_-]{6,32}\/?$/];

const markdown = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "Cache-Control": status === 200 ? "public, max-age=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

function withVary(res: Response): Response {
  const out = new Response(res.body, res);
  const vary = out.headers.get("Vary");
  if (!vary || !/\baccept\b/i.test(vary)) out.headers.set("Vary", vary ? `${vary}, Accept` : "Accept");
  return out;
}

/**
 * Content negotiation and honest status codes, in front of the static site:
 *  - pages answer Accept: text/markdown with Markdown (and always say Vary: Accept)
 *  - /page.md always returns Markdown
 *  - app routes get the app shell
 *  - anything else that doesn't exist is a real 404, in Markdown if asked
 */
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const path = url.pathname;
  if (path.startsWith("/api/") || path.startsWith("/s/") || (ctx.request.method !== "GET" && ctx.request.method !== "HEAD")) {
    return ctx.next();
  }
  const wantsMarkdown = prefersMarkdown(ctx.request.headers.get("Accept"));

  if (path.endsWith(".md")) {
    const page = pageFor(path === "/index.md" ? "/" : path.slice(0, -3));
    return page ? markdown(page.markdown) : markdown(NOT_FOUND_MARKDOWN, 404);
  }

  const page = pageFor(path);
  if (page) {
    if (wantsMarkdown) return markdown(page.markdown);
    return withVary(await ctx.next());
  }

  if (APP_ROUTES.some((r) => r.test(path))) {
    if (wantsMarkdown) return markdown(pageFor("/")!.markdown);
    const shell = await ctx.env.ASSETS.fetch(new URL("/shell", url));
    return withVary(new Response(shell.body, { status: 200, headers: shell.headers }));
  }

  const res = await ctx.next();
  if (res.status === 404 && wantsMarkdown) return markdown(NOT_FOUND_MARKDOWN, 404);
  return res.status === 404 ? withVary(res) : res;
};
