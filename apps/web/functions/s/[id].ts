import { shareMeta, storeFromEnv, type SharePayload } from "@gw/server";

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' blob: data:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
} as const;

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
  const shell = await env.ASSETS.fetch(new URL("/shell", url));
  let html = await shell.text();
  const id = String(params.id ?? "");
  const store = storeFromEnv(env);
  const row = store && /^[A-Za-z0-9_-]{6,32}$/.test(id) ? await store.getShare(id) : null;
  if (row) {
    const { tags } = shareMeta(JSON.parse(row.payload) as SharePayload, url.origin);
    // A function replacer: a string replacement would expand "$&", "$`" and "$'" found in
    // the (user-influenced) headline into pieces of the shell.
    html = html.replace(/<!--meta:start-->[\s\S]*?<!--meta:end-->/, () => tags);
  }
  return new Response(html, {
    status: row ? 200 : 404,
    // Pages does not apply public/_headers to a Response built by a Function, so carry them here.
    headers: { ...SECURITY_HEADERS, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" },
  });
};
