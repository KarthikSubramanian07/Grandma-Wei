import { shareMeta, storeFromEnv, type SharePayload } from "@gw/server";

interface Env {
  DB?: D1Database;
  KV?: KVNamespace;
  ASSETS: Fetcher;
}

/**
 * A shared scorecard page. Serves the app shell with this scorecard's
 * title, description and preview image in the head, so links unfurl.
 */
export const onRequestGet: PagesFunction<Env, "id"> = async ({ params, env, request }) => {
  const url = new URL(request.url);
  const shell = await env.ASSETS.fetch(new URL("/", url));
  let html = await shell.text();
  const id = String(params.id ?? "");
  const store = storeFromEnv(env);
  const row = store && /^[A-Za-z0-9_-]{6,32}$/.test(id) ? await store.getShare(id) : null;
  if (row) {
    const { tags } = shareMeta(JSON.parse(row.payload) as SharePayload, url.origin);
    html = html.replace(/<!--meta:start-->[\s\S]*?<!--meta:end-->/, tags);
  }
  return new Response(html, {
    status: row ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" },
  });
};
