import { handle } from "hono/cloudflare-pages";
import { createApp, initEngine } from "@gw/server";
// Wrangler bundles .wasm imports as compiled WebAssembly modules.
import qiWasm from "@gw/qi/qi_bg.wasm";

initEngine(qiWasm);

export const onRequest = handle(createApp());
